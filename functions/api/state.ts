/// <reference types="@cloudflare/workers-types" />

type Winner = 'A' | 'B'

type HistoryGame = {
  id: number
  dateLabel: string
  dateShort: string
  winner: Winner
  teamA: string[]
  teamB: string[]
}

type PlayerProfile = {
  heightCm?: number
  marketValueRp?: number
  birthDate?: string
  position?: string
  dominantHand?: string
  profilePictureUrl?: string
}

type RosterPlayer = {
  id: string
  name: string
  isHiddenFromTeams?: boolean
  isRepeatable?: boolean
  isExcludedFromLeaderboard?: boolean
  profile?: PlayerProfile
  seedStats?: {
    games: number
    wins: number
    losses: number
    points: number
  }
}

type SharedState = {
  version: number
  updatedAt: string
  historyGames: HistoryGame[]
  rosterPlayers: RosterPlayer[]
}

type Env = {
  BIAWAK_KOL_STATE: KVNamespace
  ADMIN_PASSWORD: string
}

const STATE_KEY = 'biawak-kol.shared-state'

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers)
  headers.set('Content-Type', 'application/json; charset=utf-8')
  headers.set('Cache-Control', 'no-store')

  return new Response(JSON.stringify(body), { ...init, headers })
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

function isHistoryGame(value: unknown): value is HistoryGame {
  if (!isRecord(value)) return false

  return (
    typeof value.id === 'number'
    && typeof value.dateLabel === 'string'
    && typeof value.dateShort === 'string'
    && (value.winner === 'A' || value.winner === 'B')
    && isStringArray(value.teamA)
    && isStringArray(value.teamB)
  )
}

function isSeedStats(value: unknown): value is RosterPlayer['seedStats'] {
  if (!isRecord(value)) return false

  return (
    typeof value.games === 'number'
    && typeof value.wins === 'number'
    && typeof value.losses === 'number'
    && typeof value.points === 'number'
  )
}

function isPlayerProfile(value: unknown): value is PlayerProfile {
  if (!isRecord(value)) return false

  return (
    (value.heightCm === undefined || typeof value.heightCm === 'number')
    && (value.marketValueRp === undefined || typeof value.marketValueRp === 'number')
    && (value.birthDate === undefined || typeof value.birthDate === 'string')
    && (value.position === undefined || typeof value.position === 'string')
    && (value.dominantHand === undefined || typeof value.dominantHand === 'string')
    && (value.profilePictureUrl === undefined || typeof value.profilePictureUrl === 'string')
  )
}

function isRosterPlayer(value: unknown): value is RosterPlayer {
  if (!isRecord(value)) return false

  return (
    typeof value.id === 'string'
    && typeof value.name === 'string'
    && (value.isHiddenFromTeams === undefined || typeof value.isHiddenFromTeams === 'boolean')
    && (value.isRepeatable === undefined || typeof value.isRepeatable === 'boolean')
    && (value.isExcludedFromLeaderboard === undefined || typeof value.isExcludedFromLeaderboard === 'boolean')
    && (value.profile === undefined || isPlayerProfile(value.profile))
    && (value.seedStats === undefined || isSeedStats(value.seedStats))
  )
}

function isSharedState(value: unknown): value is SharedState {
  if (!isRecord(value)) return false

  return (
    typeof value.version === 'number'
    && typeof value.updatedAt === 'string'
    && Array.isArray(value.historyGames)
    && value.historyGames.every(isHistoryGame)
    && Array.isArray(value.rosterPlayers)
    && value.rosterPlayers.every(isRosterPlayer)
  )
}

async function readCurrentState(env: Env) {
  const storedValue = await env.BIAWAK_KOL_STATE.get(STATE_KEY)
  if (storedValue === null) return null

  try {
    const parsedValue: unknown = JSON.parse(storedValue)
    return isSharedState(parsedValue) ? parsedValue : null
  } catch {
    return null
  }
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

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const currentState = await readCurrentState(env)
  return currentState === null ? jsonResponse({ error: 'not_found' }, { status: 404 }) : jsonResponse(currentState)
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!env.ADMIN_PASSWORD) {
    return jsonResponse({ error: 'missing_admin_password' }, { status: 500 })
  }

  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return jsonResponse({ error: 'invalid_json' }, { status: 400 })
  }

  if (!isRecord(payload) || typeof payload.password !== 'string') {
    return jsonResponse({ error: 'invalid_payload' }, { status: 400 })
  }

  if (!(await passwordsMatch(payload.password, env.ADMIN_PASSWORD))) {
    return jsonResponse({ error: 'unauthorized' }, { status: 401 })
  }

  if (
    typeof payload.expectedVersion !== 'number'
    || !Array.isArray(payload.historyGames)
    || !payload.historyGames.every(isHistoryGame)
    || !Array.isArray(payload.rosterPlayers)
    || !payload.rosterPlayers.every(isRosterPlayer)
  ) {
    return jsonResponse({ error: 'invalid_payload' }, { status: 400 })
  }

  const currentState = await readCurrentState(env)
  const currentVersion = currentState?.version ?? 0

  if (payload.expectedVersion !== currentVersion) {
    return jsonResponse({ error: 'version_conflict', latestState: currentState }, { status: 409 })
  }

  const nextState: SharedState = {
    version: currentVersion + 1,
    updatedAt: new Date().toISOString(),
    historyGames: payload.historyGames,
    rosterPlayers: payload.rosterPlayers,
  }

  await env.BIAWAK_KOL_STATE.put(STATE_KEY, JSON.stringify(nextState))

  return jsonResponse(nextState)
}
