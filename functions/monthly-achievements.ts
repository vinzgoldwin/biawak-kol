/// <reference types="@cloudflare/workers-types" />

type MonthlyAchievement = {
  id: string
  month: string
  category: string
  playerId?: string
  playerName?: string
  detail?: string
  createdAt: string
}

type Env = {
  BIAWAK_KOL_STATE: KVNamespace
  ADMIN_PASSWORD: string
}

const ACHIEVEMENTS_KEY = 'biawak-kol.monthly-achievements'

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers)
  headers.set('Content-Type', 'application/json; charset=utf-8')
  headers.set('Cache-Control', 'no-store')
  return new Response(JSON.stringify(body), { ...init, headers })
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isMonthlyAchievement(value: unknown): value is MonthlyAchievement {
  return isRecord(value)
    && typeof value.id === 'string'
    && typeof value.month === 'string'
    && typeof value.category === 'string'
    && typeof value.createdAt === 'string'
    && (value.playerId === undefined || typeof value.playerId === 'string')
    && (value.playerName === undefined || typeof value.playerName === 'string')
    && (value.detail === undefined || typeof value.detail === 'string')
}

async function readAchievements(env: Env) {
  const stored = await env.BIAWAK_KOL_STATE.get(ACHIEVEMENTS_KEY)
  if (stored === null) return []

  try {
    const parsed: unknown = JSON.parse(stored)
    return Array.isArray(parsed) && parsed.every(isMonthlyAchievement) ? parsed : []
  } catch {
    return []
  }
}

async function sha256(value: string) {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)))
}

async function accessMatches(input: string, expected: string) {
  const [inputHash, expectedHash] = await Promise.all([sha256(input), sha256(expected)])
  if (inputHash.length !== expectedHash.length) return false

  let difference = 0
  for (let index = 0; index < inputHash.length; index += 1) difference |= inputHash[index] ^ expectedHash[index]
  return difference === 0
}

function cleanText(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

function monthIsValid(month: string) {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(month)
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'achievement'
}

function sortAchievements(items: MonthlyAchievement[]) {
  return [...items].sort((first, second) => second.month.localeCompare(first.month) || first.category.localeCompare(second.category))
}

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  return jsonResponse({ achievements: sortAchievements(await readAchievements(env)) })
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!env.ADMIN_PASSWORD) return jsonResponse({ error: 'missing_admin_password' }, { status: 500 })

  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return jsonResponse({ error: 'invalid_json', message: 'Data achievement tidak valid.' }, { status: 400 })
  }

  if (!isRecord(payload)) return jsonResponse({ error: 'invalid_payload', message: 'Data achievement tidak valid.' }, { status: 400 })

  const accessCode = cleanText(payload.accessCode, 200)
  if (!accessCode || !(await accessMatches(accessCode, env.ADMIN_PASSWORD))) {
    return jsonResponse({ error: 'unauthorized' }, { status: 401 })
  }

  const month = cleanText(payload.month, 7)
  const category = cleanText(payload.category, 60)
  const playerId = cleanText(payload.playerId, 80)
  const playerName = cleanText(payload.playerName, 80)
  const detail = cleanText(payload.detail, 100)

  if (!monthIsValid(month) || !category) {
    return jsonResponse({ error: 'invalid_payload', message: 'Bulan dan nama kategori wajib diisi.' }, { status: 400 })
  }

  const id = `${month}:${slug(category)}`
  const achievement: MonthlyAchievement = {
    id,
    month,
    category,
    ...(playerId && playerName ? { playerId, playerName } : {}),
    ...(detail ? { detail } : {}),
    createdAt: new Date().toISOString(),
  }
  const existing = await readAchievements(env)
  const next = sortAchievements([achievement, ...existing.filter((item) => item.id !== id)])
  await env.BIAWAK_KOL_STATE.put(ACHIEVEMENTS_KEY, JSON.stringify(next))

  return jsonResponse({ achievements: next })
}
