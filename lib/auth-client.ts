const TOKEN_KEY = 'time-tracker:access-token'

export const getStoredToken = () => {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem(TOKEN_KEY)
}

export const setStoredToken = (token: string) => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(TOKEN_KEY, token)
}

export const clearStoredToken = () => {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(TOKEN_KEY)
}

export const authFetch = async (input: RequestInfo | URL, init: RequestInit = {}) => {
  const token = getStoredToken()
  const headers = new Headers(init.headers || {})
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(input, { ...init, headers })

  if (typeof window !== 'undefined' && response.status === 401) {
    window.dispatchEvent(new CustomEvent('auth:invalid'))
  }

  return response
}
