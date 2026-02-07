import Constants from 'expo-constants'

const extra = Constants.expoConfig?.extra as { apiBaseUrl?: string; appToken?: string } | undefined

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || extra?.apiBaseUrl || ''
const APP_TOKEN = process.env.EXPO_PUBLIC_APP_TOKEN || extra?.appToken || ''

export const apiFetch = async <T>(
  path: string,
  options: RequestInit = {}
): Promise<T> => {
  if (!API_BASE_URL) {
    throw new Error('API_BASE_URL is not configured')
  }

  const headers = new Headers(options.headers || {})
  headers.set('Content-Type', 'application/json')
  if (APP_TOKEN) {
    headers.set('Authorization', `Bearer ${APP_TOKEN}`)
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
