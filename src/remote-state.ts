import type { HistoryGame, RosterPlayer } from './data'

export type SharedState = {
  version: number
  updatedAt: string
  historyGames: HistoryGame[]
  rosterPlayers: RosterPlayer[]
}

export type SaveSharedStateInput = {
  password: string
  expectedVersion: number
  historyGames: HistoryGame[]
  rosterPlayers: RosterPlayer[]
}

type ApiErrorCode = 'unauthorized' | 'conflict' | 'network' | 'invalid-response' | 'server'

export class SharedStateError extends Error {
  code: ApiErrorCode
  latestState?: SharedState

  constructor(code: ApiErrorCode, message: string, latestState?: SharedState) {
    super(message)
    this.name = 'SharedStateError'
    this.code = code
    this.latestState = latestState
  }
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

function isRosterPlayer(value: unknown): value is RosterPlayer {
  if (!isRecord(value)) return false

  return (
    typeof value.id === 'string'
    && typeof value.name === 'string'
    && (value.isHiddenFromTeams === undefined || typeof value.isHiddenFromTeams === 'boolean')
  )
}

export function isSharedState(value: unknown): value is SharedState {
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

async function readJsonResponse(response: Response) {
  try {
    return await response.json() as unknown
  } catch {
    throw new SharedStateError('invalid-response', 'Server returned invalid JSON.')
  }
}

export async function fetchSharedState() {
  let response: Response

  try {
    response = await fetch('/api/state', { headers: { Accept: 'application/json' } })
  } catch {
    throw new SharedStateError('network', 'Could not reach shared storage.')
  }

  if (response.status === 404) return null
  if (!response.ok) throw new SharedStateError('server', 'Could not load shared storage.')

  const payload = await readJsonResponse(response)
  if (!isSharedState(payload)) throw new SharedStateError('invalid-response', 'Shared storage response was not valid.')

  return payload
}

export async function saveSharedState(input: SaveSharedStateInput) {
  let response: Response

  try {
    response = await fetch('/api/state', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
    })
  } catch {
    throw new SharedStateError('network', 'Could not reach shared storage.')
  }

  const payload = await readJsonResponse(response)

  if (response.status === 401) {
    throw new SharedStateError('unauthorized', 'Password salah.')
  }

  if (response.status === 409) {
    const latestState = isRecord(payload) && isSharedState(payload.latestState) ? payload.latestState : undefined
    throw new SharedStateError('conflict', 'Data sudah berubah di perangkat lain.', latestState)
  }

  if (!response.ok) {
    throw new SharedStateError('server', 'Could not save shared storage.')
  }

  if (!isSharedState(payload)) throw new SharedStateError('invalid-response', 'Shared storage response was not valid.')

  return payload
}
