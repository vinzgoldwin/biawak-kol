/// <reference types="@cloudflare/workers-types" />

type MonthlyAwardStats = {
  games: number
  wins: number
  losses: number
}

type MonthlyAward = {
  month: string
  playerId: string
  playerName: string
  photoKey: string
  contentType: string
  uploadedAt: string
  manualStats?: MonthlyAwardStats
}

type Env = {
  BIAWAK_KOL_STATE: KVNamespace
  BIAWAK_KOL_MEDIA: R2Bucket
  ADMIN_PASSWORD: string
}

const AWARDS_KEY = 'biawak-kol.monthly-awards'
const MAX_PHOTO_SIZE = 5 * 1024 * 1024
const ALLOWED_IMAGE_TYPES = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
])

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers)
  headers.set('Content-Type', 'application/json; charset=utf-8')
  headers.set('Cache-Control', 'no-store')

  return new Response(JSON.stringify(body), { ...init, headers })
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isManualStats(value: unknown): value is MonthlyAwardStats {
  return (
    isRecord(value)
    && typeof value.games === 'number'
    && typeof value.wins === 'number'
    && typeof value.losses === 'number'
  )
}

function isMonthlyAward(value: unknown): value is MonthlyAward {
  return (
    isRecord(value)
    && typeof value.month === 'string'
    && typeof value.playerId === 'string'
    && typeof value.playerName === 'string'
    && typeof value.photoKey === 'string'
    && typeof value.contentType === 'string'
    && typeof value.uploadedAt === 'string'
    && (value.manualStats === undefined || isManualStats(value.manualStats))
  )
}

async function readAwards(env: Env) {
  const storedValue = await env.BIAWAK_KOL_STATE.get(AWARDS_KEY)
  if (storedValue === null) return []

  try {
    const parsedValue: unknown = JSON.parse(storedValue)
    return Array.isArray(parsedValue) && parsedValue.every(isMonthlyAward) ? parsedValue : []
  } catch {
    return []
  }
}

async function writeAwards(env: Env, awards: MonthlyAward[]) {
  await env.BIAWAK_KOL_STATE.put(AWARDS_KEY, JSON.stringify(awards))
}

async function sha256(value: string) {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)))
}

async function accessMatches(input: string, expected: string) {
  const [inputHash, expectedHash] = await Promise.all([sha256(input), sha256(expected)])

  if (inputHash.length !== expectedHash.length) return false

  let difference = 0
  for (let index = 0; index < inputHash.length; index += 1) {
    difference |= inputHash[index] ^ expectedHash[index]
  }

  return difference === 0
}

function formValue(formData: FormData, key: string) {
  const value = formData.get(key)
  return typeof value === 'string' ? value.trim() : ''
}

function formNumber(formData: FormData, key: string) {
  const value = Number(formValue(formData, key))
  return Number.isInteger(value) && value >= 0 ? value : null
}

function monthIsValid(month: string) {
  if (!/^\d{4}-\d{2}$/.test(month)) return false

  const monthNumber = Number(month.slice(5, 7))
  return monthNumber >= 1 && monthNumber <= 12
}

function cleanFileSegment(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'player'
}

function sortAwards(awards: MonthlyAward[]) {
  return [...awards].sort((first, second) => second.month.localeCompare(first.month))
}

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const awards = await readAwards(env)
  return jsonResponse({ mvps: sortAwards(awards) })
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!env.ADMIN_PASSWORD) return jsonResponse({ error: 'missing_admin_password' }, { status: 500 })
  if (!env.BIAWAK_KOL_MEDIA) return jsonResponse({ error: 'missing_media_bucket' }, { status: 500 })

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return jsonResponse({ error: 'invalid_form', message: 'Upload form tidak valid.' }, { status: 400 })
  }

  const accessCode = formValue(formData, 'password')
  if (!accessCode || !(await accessMatches(accessCode, env.ADMIN_PASSWORD))) {
    return jsonResponse({ error: 'unauthorized' }, { status: 401 })
  }

  const month = formValue(formData, 'month')
  const playerId = formValue(formData, 'playerId')
  const playerName = formValue(formData, 'playerName')
  const games = formNumber(formData, 'games')
  const wins = formNumber(formData, 'wins')
  const losses = formNumber(formData, 'losses')
  const photo = formData.get('photo')

  if (!monthIsValid(month) || !playerId || !playerName || !(photo instanceof File) || games === null || wins === null || losses === null) {
    return jsonResponse({ error: 'invalid_payload', message: 'Bulan, pemain, foto, games, wins, dan losses wajib diisi.' }, { status: 400 })
  }

  if (wins > games || losses > games || wins + losses > games) {
    return jsonResponse({ error: 'invalid_stats', message: 'Wins + losses tidak boleh lebih besar dari games.' }, { status: 400 })
  }

  const extension = ALLOWED_IMAGE_TYPES.get(photo.type)
  if (!extension) return jsonResponse({ error: 'unsupported_photo', message: 'Gunakan foto JPG, PNG, atau WebP.' }, { status: 415 })

  if (photo.size <= 0 || photo.size > MAX_PHOTO_SIZE) return jsonResponse({ error: 'photo_too_large', message: 'Ukuran foto maksimal 5MB.' }, { status: 413 })

  const existingAwards = await readAwards(env)
  const previousAward = existingAwards.find((award) => award.month === month)
  const photoKey = `monthly-awards/${month}-${cleanFileSegment(playerId)}.${extension}`
  const uploadedAt = new Date().toISOString()

  await env.BIAWAK_KOL_MEDIA.put(photoKey, photo.stream(), {
    httpMetadata: { contentType: photo.type },
    customMetadata: { month, playerId, playerName, uploadedAt },
  })

  if (previousAward && previousAward.photoKey !== photoKey) {
    await env.BIAWAK_KOL_MEDIA.delete(previousAward.photoKey)
  }

  const nextAward: MonthlyAward = {
    month,
    playerId,
    playerName,
    photoKey,
    contentType: photo.type,
    uploadedAt,
    manualStats: { games, wins, losses },
  }
  const nextAwards = sortAwards([nextAward, ...existingAwards.filter((award) => award.month !== month)])

  await writeAwards(env, nextAwards)

  return jsonResponse({ mvps: nextAwards })
}
