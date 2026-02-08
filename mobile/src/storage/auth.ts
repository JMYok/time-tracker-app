import AsyncStorage from '@react-native-async-storage/async-storage'

const TOKEN_KEY = 'time-tracker:access-token'

export const readAuthToken = async (): Promise<string | null> => {
  try {
    const token = await AsyncStorage.getItem(TOKEN_KEY)
    return token || null
  } catch (error) {
    console.warn('Failed to read auth token', error)
    return null
  }
}

export const writeAuthToken = async (token: string) => {
  try {
    await AsyncStorage.setItem(TOKEN_KEY, token)
  } catch (error) {
    console.warn('Failed to write auth token', error)
  }
}

export const clearAuthToken = async () => {
  try {
    await AsyncStorage.removeItem(TOKEN_KEY)
  } catch (error) {
    console.warn('Failed to clear auth token', error)
  }
}
