import { getApiBaseUrl, setAuthToken } from './client'
import { readAuthToken, writeAuthToken, clearAuthToken } from '../storage/auth'

export const verifyToken = async (token: string) => {
  const baseUrl = getApiBaseUrl()
  if (!baseUrl) {
    throw new Error('API_BASE_URL is not configured')
  }

  const response = await fetch(`${baseUrl}/api/auth/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ token }),
  })

  if (!response.ok) {
    return false
  }

  setAuthToken(token)
  await writeAuthToken(token)
  return true
}

export const loadStoredToken = async () => {
  const token = await readAuthToken()
  if (token) {
    setAuthToken(token)
  }
  return token
}

export const clearStoredToken = async () => {
  setAuthToken(null)
  await clearAuthToken()
}
