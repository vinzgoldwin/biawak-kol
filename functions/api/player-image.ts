/// <reference types="@cloudflare/workers-types" />

type Env = {
  BIAWAK_KOL_MEDIA: R2Bucket
  ADMIN_PASSWORD: string
}

const MAX_PHOTO_SIZE = 5 * 1024 * 1024
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers)
  headers.set('Content-Type', 'application/json; charset=utf-8')
  headers.set('Cache-Control', 'no-store')
  return new Response(JSON.stringify(body), { ...init, headers })
}

async function sha256(value: string) {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)))
}

async function passwordsMatch(input: string, expected: string) {
  const [inputHash, expectedHash] = await Promise.all([sha256(input), sha256(expected)])
  if (inputHash.length !== expectedHash.length) return false

  let difference = 0
  for (let index = 0; index < inputHash.length; index += 1) {
    difference |= inputHash[index] ^ expectedHash[index]
  }

  return difference === 0
}

function isValidPlayerId(value: string) {
  return /^[a-z0-9-]+$/.test(value) && value.length > 0 && value.length <= 64
}

function photoKeyFor(playerId: string) {
  return `player-images/${playerId}`
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url)
  const playerId = url.searchParams.get('playerId')
  if (!playerId || !isValidPlayerId(playerId)) {
    return new Response('Missing or invalid playerId', { status: 400 })
  }

  const object = await env.BIAWAK_KOL_MEDIA.get(photoKeyFor(playerId))
  if (!object) return new Response('Not found', { status: 404 })

  const headers = new Headers()
  object.writeHttpMetadata(headers)
  headers.set('etag', object.httpEtag)
  headers.set('Cache-Control', 'public, max-age=31536000, immutable')

  return new Response(object.body, { headers })
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

  const password = typeof formData.get('password') === 'string' ? (formData.get('password') as string).trim() : ''
  if (!password || !(await passwordsMatch(password, env.ADMIN_PASSWORD))) {
    return jsonResponse({ error: 'unauthorized' }, { status: 401 })
  }

  const playerId = typeof formData.get('playerId') === 'string' ? (formData.get('playerId') as string).trim() : ''
  if (!playerId || !isValidPlayerId(playerId)) {
    return jsonResponse({ error: 'invalid_player', message: 'Player ID tidak valid.' }, { status: 400 })
  }

  const photo: unknown = formData.get('photo')
  if (!(photo instanceof File)) {
    return jsonResponse({ error: 'missing_photo', message: 'Foto wajib diisi.' }, { status: 400 })
  }

  if (!ALLOWED_IMAGE_TYPES.has(photo.type)) {
    return jsonResponse({ error: 'unsupported_photo', message: 'Gunakan foto JPG, PNG, atau WebP.' }, { status: 415 })
  }

  if (photo.size <= 0 || photo.size > MAX_PHOTO_SIZE) {
    return jsonResponse({ error: 'photo_too_large', message: 'Ukuran foto maksimal 5MB.' }, { status: 413 })
  }

  const photoKey = photoKeyFor(playerId)
  const uploadedAt = new Date().toISOString()

  await env.BIAWAK_KOL_MEDIA.put(photoKey, photo.stream(), {
    httpMetadata: { contentType: photo.type },
    customMetadata: { playerId, uploadedAt },
  })

  const imageUrl = `/api/player-image?playerId=${encodeURIComponent(playerId)}&v=${encodeURIComponent(uploadedAt)}`

  return jsonResponse({ photoKey, imageUrl, uploadedAt })
}

export const onRequestDelete: PagesFunction<Env> = async ({ request, env }) => {
  if (!env.ADMIN_PASSWORD) return jsonResponse({ error: 'missing_admin_password' }, { status: 500 })

  const url = new URL(request.url)
  const playerId = url.searchParams.get('playerId')
  if (!playerId || !isValidPlayerId(playerId)) {
    return jsonResponse({ error: 'invalid_player' }, { status: 400 })
  }

  const password = url.searchParams.get('password')
  if (!password || !(await passwordsMatch(password, env.ADMIN_PASSWORD))) {
    return jsonResponse({ error: 'unauthorized' }, { status: 401 })
  }

  await env.BIAWAK_KOL_MEDIA.delete(photoKeyFor(playerId))
  return jsonResponse({ ok: true })
}
