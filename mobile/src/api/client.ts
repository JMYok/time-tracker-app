import Constants from 'expo-constants'
import { readAuthToken } from '../storage/auth'

const extra = Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || extra?.apiBaseUrl || ''
let cachedToken: string | null = null

export const getApiBaseUrl = () => API_BASE_URL

export const setAuthToken = (token: string | null) => {
  cachedToken = token
}

const resolveToken = async () => {
  if (cachedToken !== null) return cachedToken
  const stored = await readAuthToken()
  cachedToken = stored || ''
  return cachedToken
}

export const apiFetch = async <T>(
  path: string,
  options: RequestInit = {}
): Promise<T> => {
  if (!API_BASE_URL) {
    throw new Error('API_BASE_URL is not configured')
  }

  const headers = new Headers(options.headers || {})
  headers.set('Content-Type', 'application/json')
  if (!headers.has('Authorization')) {
    const token = await resolveToken()
    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  })

  const text = await response.text()
  const data = text ? JSON.parse(text) : {}

  if (!response.ok) {
    throw new Error(data?.error || `Request failed: ${response.status}`)
  }

  return data as T
}
