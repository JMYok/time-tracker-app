import AsyncStorage from '@react-native-async-storage/async-storage'
import { createInitialSyncState, type EntrySyncState } from '../sync/entrySync'

const SYNC_QUEUE_KEY = 'time-tracker:entry-sync-queue'

export const readEntrySyncState = async (): Promise<EntrySyncState> => {
  try {
    const raw = await AsyncStorage.getItem(SYNC_QUEUE_KEY)
    if (!raw) return createInitialSyncState()
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.tasks)) {
      return createInitialSyncState()
    }
    return parsed as EntrySyncState
  } catch (error) {
    console.warn('Failed to read entry sync queue', error)
    return createInitialSyncState()
  }
}

export const writeEntrySyncState = async (state: EntrySyncState) => {
  try {
    await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(state))
  } catch (error) {
    console.warn('Failed to write entry sync queue', error)
  }
}

