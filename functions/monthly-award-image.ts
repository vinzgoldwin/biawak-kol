/// <reference types="@cloudflare/workers-types" />

type MonthlyAward = {
  month: string
  playerId: string
  playerName: string
  photoKey: string
  contentType: string
  uploadedAt: string
}

type Env = {
  BIAWAK_KOL_STATE: KVNamespace
  BIAWAK_KOL_MEDIA: R2Bucket
}

const AWARDS_KEY = 'biawak-kol.monthly-awards'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
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

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url)
  const month = url.searchParams.get('month')
  if (!month) return new Response('Missing month', { status: 400 })

  const award = (await readAwards(env)).find((item) => item.month === month)
  if (!award) return new Response('Not found', { status: 404 })

  const object = await env.BIAWAK_KOL_MEDIA.get(award.photoKey)
  if (!object) return new Response('Not found', { status: 404 })

  const headers = new Headers()
  object.writeHttpMetadata(headers)
  headers.set('etag', object.httpEtag)
  headers.set('Cache-Control', 'public, max-age=31536000, immutable')

  return new Response(object.body, { headers })
}
