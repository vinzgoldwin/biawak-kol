export type PlayerImageUploadResult = {
  photoKey: string
  imageUrl: string
  uploadedAt: string
}

const endpoint = '/api/player-image'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export async function uploadPlayerImage(input: { password: string; playerId: string; photo: File }): Promise<PlayerImageUploadResult> {
  const body = new FormData()
  body.set('password', input.password)
  body.set('playerId', input.playerId)
  body.set('photo', input.photo)

  let response: Response

  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: { Accept: 'application/json' },
      body,
    })
  } catch {
    throw new Error('Could not reach player image storage.')
  }

  let payload: unknown
  try {
    payload = await response.json()
  } catch {
    throw new Error('Server returned invalid JSON.')
  }

  if (response.status === 401) throw new Error('Password salah.')
  if (response.status === 413) throw new Error('Ukuran foto maksimal 5MB.')
  if (response.status === 415) throw new Error('Gunakan foto JPG, PNG, atau WebP.')
  if (response.status === 400) {
    throw new Error(isRecord(payload) && typeof payload.message === 'string' ? payload.message : 'Data upload tidak valid.')
  }
  if (!response.ok) throw new Error('Could not save player image.')

  if (!isRecord(payload) || typeof payload.photoKey !== 'string' || typeof payload.imageUrl !== 'string' || typeof payload.uploadedAt !== 'string') {
    throw new Error('Server returned invalid upload response.')
  }

  return {
    photoKey: payload.photoKey,
    imageUrl: payload.imageUrl,
    uploadedAt: payload.uploadedAt,
  }
}

export async function deletePlayerImage(input: { password: string; playerId: string }): Promise<boolean> {
  const params = new URLSearchParams({ playerId: input.playerId, password: input.password })

  let response: Response

  try {
    response = await fetch(`${endpoint}?${params.toString()}`, { method: 'DELETE' })
  } catch {
    throw new Error('Could not reach player image storage.')
  }

  return response.ok
}
