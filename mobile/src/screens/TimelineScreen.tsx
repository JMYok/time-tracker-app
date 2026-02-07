import { useEffect, useMemo, useState } from 'react'
import { View, StyleSheet, FlatList } from 'react-native'
import { fetchEntries, createEntry, updateEntry, deleteEntry, TimeEntry } from '../api/entries'
import { colors } from '../theme'
import { buildTimeSlots, formatDateKey, parseDateKey, getCurrentSlotStart } from '../utils/date'
import { TopBar } from '../components/TopBar'
import { TimeSlotCard } from '../components/TimeSlotCard'

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
        const result = await fetchEntries(dateKey)
        if (isMounted) {
          setEntries(result.entries || [])
        }
      } catch (error) {
        if (isMounted) {
          setEntries([])
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
      const idx = prev.findIndex((item) => item.id === entry.id)
      if (idx === -1) {
        return [...prev, entry].sort((a, b) => a.startTime.localeCompare(b.startTime))
      }
      const next = [...prev]
      next[idx] = entry
      return next
    })
  }

  const removeEntry = (id: string) => {
    setEntries((prev) => prev.filter((item) => item.id !== id))
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
                    const result = await updateEntry(entry.id, { activity, thought })
                    if (result.data) {
                      upsertEntry(result.data)
                    }
                  } else {
                    const result = await createEntry({
                      date: dateKey,
                      startTime: item.startTime,
                      endTime: item.endTime,
                      activity,
                      thought,
                    })
                    if (result.data) {
                      upsertEntry(result.data)
                    }
                  }
                }}
                onDelete={async () => {
                  if (!entry) return
                  await deleteEntry(entry.id)
                  removeEntry(entry.id)
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
