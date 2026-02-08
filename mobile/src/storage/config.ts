import AsyncStorage from '@react-native-async-storage/async-storage'
import type { AppConfig } from '../api/config'

const CONFIG_KEY = 'time-tracker:config'

export const readConfigCache = async (): Promise<AppConfig | null> => {
  try {
    const raw = await AsyncStorage.getItem(CONFIG_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    return parsed as AppConfig
  } catch (error) {
    console.warn('Failed to read config cache', error)
    return null
  }
}

export const writeConfigCache = async (config: AppConfig) => {
  try {
    await AsyncStorage.setItem(CONFIG_KEY, JSON.stringify(config))
  } catch (error) {
    console.warn('Failed to write config cache', error)
  }
}
