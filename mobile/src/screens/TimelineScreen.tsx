import { useEffect, useMemo, useState } from 'react'
import { View, StyleSheet, FlatList } from 'react-native'
import { fetchEntries, createEntry, updateEntry, deleteEntry, TimeEntry } from '../api/entries'
import { colors } from '../theme'
import { buildTimeSlots, formatDateKey, getCurrentSlotStart } from '../utils/date'
import { TopBar } from '../components/TopBar'
import { TimeSlotCard } from '../components/TimeSlotCard'
import { readEntriesCache, writeEntriesCache } from '../storage/entries'

export const TimelineScreen = () => {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [loading, setLoading] = useState(false)

  const dateKey = formatDateKey(selectedDate)
  const isToday = formatDateKey(new Date()) === dateKey
  const currentSlot = getCurrentSlotStart()

  useEffect(() => {
    let isMounted = true
    const load = async () => {
      setLoading(true)
      try {
        const cached = await readEntriesCache(dateKey)
        if (isMounted && cached) {
          setEntries(cached)
        }

        const result = await fetchEntries(dateKey)
        if (isMounted) {
          const fresh = result.entries || []
          setEntries(fresh)
          await writeEntriesCache(dateKey, fresh)
        }
      } catch (error) {
        if (isMounted) {
          const cached = await readEntriesCache(dateKey)
          setEntries(cached || [])
        }
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    load()
    return () => {
      isMounted = false
    }
  }, [dateKey])

  const entryMap = useMemo(() => {
    const map = new Map<string, TimeEntry>()
    entries.forEach((entry) => map.set(entry.startTime, entry))
    return map
  }, [entries])

  const handlePrevDay = () => {
    const date = new Date(selectedDate)
    date.setDate(date.getDate() - 1)
    setSelectedDate(date)
  }

  const handleNextDay = () => {
    const date = new Date(selectedDate)
    date.setDate(date.getDate() + 1)
    setSelectedDate(date)
  }

  const handleToday = () => {
    setSelectedDate(new Date())
  }

  const upsertEntry = (entry: TimeEntry) => {
    setEntries((prev) => {
      const idx = prev.findIndex((item) => item.id === entry.id || item.startTime === entry.startTime)
      if (idx === -1) {
        const next = [...prev, entry].sort((a, b) => a.startTime.localeCompare(b.startTime))
        void writeEntriesCache(dateKey, next)
        return next
      }
      const next = [...prev]
      next[idx] = entry
      void writeEntriesCache(dateKey, next)
      return next
    })
  }

  const removeEntry = (id: string) => {
    setEntries((prev) => {
      const next = prev.filter((item) => item.id !== id)
      void writeEntriesCache(dateKey, next)
      return next
    })
  }

  const slots = useMemo(() => buildTimeSlots(), [])

  return (
    <View style={styles.container}>
      <TopBar date={selectedDate} onPrev={handlePrevDay} onNext={handleNextDay} onToday={handleToday} showToday={isToday} />

      <View style={styles.listWrapper}>
        <View style={styles.timelineLine} />
        <FlatList
          data={slots}
          keyExtractor={(item) => `${dateKey}-${item.startTime}`}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const entry = entryMap.get(item.startTime)
            const isCurrent = isToday && currentSlot === item.startTime

            return (
              <TimeSlotCard
                startTime={item.startTime}
                endTime={item.endTime}
                isCurrent={isCurrent}
                entry={entry}
                onSave={async ({ activity, thought }) => {
                  if (entry) {
                    const optimistic = { ...entry, activity, thought }
                    upsertEntry(optimistic)
                    void updateEntry(entry.id, { activity, thought })
                      .then((result) => {
                        if (result.data) {
                          upsertEntry(result.data)
                        }
                      })
                      .catch((error) => {
                        console.warn('Failed to sync entry update', error)
                      })
                  } else {
                    const localEntry: TimeEntry = {
                      id: `local-${dateKey}-${item.startTime}`,
                      date: dateKey,
                      startTime: item.startTime,
                      endTime: item.endTime,
                      activity,
                      thought,
                    }
                    upsertEntry(localEntry)
                    void createEntry({
                      date: dateKey,
                      startTime: item.startTime,
                      endTime: item.endTime,
                      activity,
                      thought,
                    })
                      .then((result) => {
                        if (result.data) {
                          upsertEntry(result.data)
                        }
                      })
                      .catch((error) => {
                        console.warn('Failed to sync entry create', error)
                      })
                  }
                }}
                onDelete={async () => {
                  if (!entry) return
                  removeEntry(entry.id)
                  void deleteEntry(entry.id).catch((error) => {
                    console.warn('Failed to sync entry delete', error)
                  })
                }}
              />
            )
          }}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 100,
  },
  listWrapper: {
    flex: 1,
  },
  timelineLine: {
    position: 'absolute',
    left: 86,
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: colors.border,
  },
})
