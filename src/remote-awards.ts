export type MonthlyAwardStats = {
  games: number
  wins: number
  losses: number
}

export type MonthlyAward = {
  month: string
  playerId: string
  playerName: string
  photoKey: string
  contentType: string
  uploadedAt: string
  manualStats?: MonthlyAwardStats
}

export type UploadMonthlyAwardInput = {
  accessCode: string
  month: string
  playerId: string
  playerName: string
  photo: File
  manualStats: MonthlyAwardStats
}

const awardEndpoint = '/monthly-award'

export function getAwardImageUrl(award: MonthlyAward) {
  const params = new URLSearchParams({ month: award.month, v: award.uploadedAt })
  return `/monthly-award-image?${params.toString()}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function looksLikeAward(value: unknown) {
  return isRecord(value) && typeof value.month === 'string'
}

function readAwardList(payload: unknown) {
  if (Array.isArray(payload) && payload.every(looksLikeAward)) return payload as MonthlyAward[]
  if (isRecord(payload) && Array.isArray(payload.mvps) && payload.mvps.every(looksLikeAward)) return payload.mvps as MonthlyAward[]

  throw new Error('Award response was not valid.')
}

async function readJsonResponse(response: Response) {
  try {
    return await response.json() as unknown
  } catch {
    throw new Error('Server returned invalid JSON.')
  }
}

function awardError(name: string, message: string) {
  const error = new Error(message)
  error.name = name
  return error
}

export function isAwardAccessError(error: unknown) {
  return error instanceof Error && error.name === 'AwardAccessError'
}

export async function fetchMonthlyAwards() {
  let response: Response

  try {
    response = await fetch(awardEndpoint, { headers: { Accept: 'application/json' } })
  } catch {
    throw awardError('AwardNetworkError', 'Could not reach monthly award storage.')
  }

  if (!response.ok) throw awardError('AwardServerError', 'Could not load monthly award list.')

  const payload = await readJsonResponse(response)
  return readAwardList(payload)
}

export async function uploadMonthlyAward(input: UploadMonthlyAwardInput) {
  const body = new FormData()
  body.set('password', input.accessCode)
  body.set('month', input.month)
  body.set('playerId', input.playerId)
  body.set('playerName', input.playerName)
  body.set('games', String(input.manualStats.games))
  body.set('wins', String(input.manualStats.wins))
  body.set('losses', String(input.manualStats.losses))
  body.set('photo', input.photo)

  let response: Response

  try {
    response = await fetch(awardEndpoint, {
      method: 'POST',
      headers: { Accept: 'application/json' },
      body,
    })
  } catch {
    throw awardError('AwardNetworkError', 'Could not reach monthly award storage.')
  }

  const payload = await readJsonResponse(response)

  if (response.status === 401) throw awardError('AwardAccessError', 'Password salah.')
  if (response.status === 413 || response.status === 415 || response.status === 400) {
    throw awardError('AwardInputError', isRecord(payload) && typeof payload.message === 'string' ? payload.message : 'Foto atau stat MVP tidak valid.')
  }
  if (!response.ok) throw awardError('AwardServerError', 'Could not save monthly award.')

  return readAwardList(payload)
}
