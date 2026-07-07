export type MonthlyAchievement = {
  id: string
  month: string
  category: string
  playerId?: string
  playerName?: string
  detail?: string
  createdAt: string
}

export type SaveMonthlyAchievementInput = {
  accessCode: string
  month: string
  category: string
  playerId?: string
  playerName?: string
  detail?: string
}

const endpoint = '/monthly-achievements'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function looksLikeAchievement(value: unknown): value is MonthlyAchievement {
  return isRecord(value)
    && typeof value.id === 'string'
    && typeof value.month === 'string'
    && typeof value.category === 'string'
    && typeof value.createdAt === 'string'
}

function readList(payload: unknown) {
  if (Array.isArray(payload) && payload.every(looksLikeAchievement)) return payload
  if (isRecord(payload) && Array.isArray(payload.achievements) && payload.achievements.every(looksLikeAchievement)) {
    return payload.achievements
  }

  throw new Error('Achievement response was not valid.')
}

async function readJson(response: Response) {
  try {
    return await response.json() as unknown
  } catch {
    throw new Error('Server returned invalid JSON.')
  }
}

function achievementError(name: string, message: string) {
  const error = new Error(message)
  error.name = name
  return error
}

export function isAchievementAccessError(error: unknown) {
  return error instanceof Error && error.name === 'AchievementAccessError'
}

export async function fetchMonthlyAchievements() {
  let response: Response

  try {
    response = await fetch(endpoint, { headers: { Accept: 'application/json' } })
  } catch {
    throw achievementError('AchievementNetworkError', 'Could not reach achievement storage.')
  }

  if (!response.ok) throw achievementError('AchievementServerError', 'Could not load achievements.')
  return readList(await readJson(response))
}

export async function saveMonthlyAchievement(input: SaveMonthlyAchievementInput) {
  let response: Response

  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
  } catch {
    throw achievementError('AchievementNetworkError', 'Could not reach achievement storage.')
  }

  const payload = await readJson(response)
  if (response.status === 401) throw achievementError('AchievementAccessError', 'Password salah.')
  if (response.status === 400) {
    throw achievementError('AchievementInputError', isRecord(payload) && typeof payload.message === 'string' ? payload.message : 'Achievement tidak valid.')
  }
  if (!response.ok) throw achievementError('AchievementServerError', 'Could not save achievement.')

  return readList(payload)
}
