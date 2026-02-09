import AsyncStorage from '@react-native-async-storage/async-storage'

const KEY = 'time-tracker:selected-date'

export const readSelectedDate = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(KEY)
  } catch (error) {
    console.warn('Failed to read selected date', error)
    return null
  }
}

export const writeSelectedDate = async (dateKey: string) => {
  try {
    await AsyncStorage.setItem(KEY, dateKey)
  } catch (error) {
    console.warn('Failed to write selected date', error)
  }
}
