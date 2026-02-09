import AsyncStorage from '@react-native-async-storage/async-storage'

const KEY_PREFIX = 'time-tracker:analysis:'

const buildKey = (date: string) => `${KEY_PREFIX}${date}`

export const readAnalysisCache = async <T>(date: string): Promise<T | null> => {
  try {
    const raw = await AsyncStorage.getItem(buildKey(date))
    if (!raw) return null
    return JSON.parse(raw) as T
  } catch (error) {
    console.warn('Failed to read analysis cache', error)
    return null
  }
}

export const writeAnalysisCache = async (date: string, value: unknown) => {
  try {
    await AsyncStorage.setItem(buildKey(date), JSON.stringify(value))
  } catch (error) {
    console.warn('Failed to write analysis cache', error)
  }
}
