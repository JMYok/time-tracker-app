import AsyncStorage from '@react-native-async-storage/async-storage'
import type { TimeEntry } from '../api/entries'

const KEY_PREFIX = 'time-tracker:entries:'

const buildKey = (dateKey: string) => `${KEY_PREFIX}${dateKey}`

export const readEntriesCache = async (dateKey: string): Promise<TimeEntry[] | null> => {
  try {
    const raw = await AsyncStorage.getItem(buildKey(dateKey))
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return null
    return parsed as TimeEntry[]
  } catch (error) {
    console.warn('Failed to read entries cache', error)
    return null
  }
}

export const writeEntriesCache = async (dateKey: string, entries: TimeEntry[]) => {
  try {
    await AsyncStorage.setItem(buildKey(dateKey), JSON.stringify(entries))
  } catch (error) {
    console.warn('Failed to write entries cache', error)
  }
}

export const clearEntriesCache = async (dateKey: string) => {
  try {
    await AsyncStorage.removeItem(buildKey(dateKey))
  } catch (error) {
    console.warn('Failed to clear entries cache', error)
  }
}
