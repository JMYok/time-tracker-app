import { useEffect, useMemo, useRef, useState } from 'react'
import { Alert, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { createEntry, deleteEntry, fetchEntries, TimeEntry, updateEntry } from '../api/entries'
import { TopBar } from '../components/TopBar'
import { TimeSlotCard } from '../components/TimeSlotCard'
import { timelineLayout, timelineLineLeft, timelineSelectionWidth } from '../components/timelineLayout'
import { readEntriesCache, writeEntriesCache } from '../storage/entries'
import { colors } from '../theme'
import { buildTimeSlots, formatDateKey, getCurrentSlotStart } from '../utils/date'

export const TimelineScreen = () => {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [selectedSlots, setSelectedSlots] = useState<string[]>([])
  const [batchActivity, setBatchActivity] = useState('')
  const [isBatchSaving, setIsBatchSaving] = useState(false)
  const [isSelecting, setIsSelecting] = useState(false)

  const slotLayouts = useRef<Record<string, { y: number; height: number }>>({})
  const selectionAnchor = useRef<number | null>(null)
  const scrollOffset = useRef(0)
  const selectionTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const dateKey = formatDateKey(selectedDate)
  const isToday = formatDateKey(new Date()) === dateKey
  const currentSlot = getCurrentSlotStart()

  useEffect(() => {
    let isMounted = true
    const load = async () => {
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
      } catch {
        if (isMounted) {
          const cached = await readEntriesCache(dateKey)
          setEntries(cached || [])
        }
      }
    }
    load()
    return () => {
      isMounted = false
    }
  }, [dateKey])

  useEffect(() => {
    setSelectedSlots([])
    setBatchActivity('')
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

  const findSlotIndexAtY = (locationY: number) => {
    const contentY = locationY + scrollOffset.current
    for (let index = 0; index < slots.length; index += 1) {
      const startTime = slots[index].startTime
      const layout = slotLayouts.current[startTime]
      if (!layout) continue
      if (contentY >= layout.y && contentY <= layout.y + layout.height) {
        return index
      }
    }
    return null
  }

  const updateSelectionRange = (anchorIndex: number, currentIndex: number) => {
    const start = Math.min(anchorIndex, currentIndex)
    const end = Math.max(anchorIndex, currentIndex)
    const range = slots.slice(start, end + 1).map((slot) => slot.startTime)
    setSelectedSlots(range)
  }

  const handleSelectStart = (locationY: number) => {
    if (selectionTimer.current) {
      clearTimeout(selectionTimer.current)
    }
    selectionTimer.current = setTimeout(() => {
      const index = findSlotIndexAtY(locationY)
      if (index === null) return
      selectionAnchor.current = index
      setIsSelecting(true)
      updateSelectionRange(index, index)
    }, 250)
  }

  const handleSelectMove = (locationY: number) => {
    if (!isSelecting || selectionAnchor.current === null) return
    const index = findSlotIndexAtY(locationY)
    if (index === null) return
    updateSelectionRange(selectionAnchor.current, index)
  }

  const handleSelectEnd = () => {
    if (selectionTimer.current) {
      clearTimeout(selectionTimer.current)
      selectionTimer.current = null
    }
    if (isSelecting) {
      setIsSelecting(false)
    }
    selectionAnchor.current = null
  }

  const clearSelection = () => {
    setSelectedSlots([])
    setBatchActivity('')
  }

  const handleBatchSave = async () => {
    const content = batchActivity.trim()
    if (!content || isBatchSaving || selectedSlots.length === 0) return

    setIsBatchSaving(true)
    try {
      await Promise.all(
        selectedSlots.map(async (startTime) => {
          const slot = slots.find((item) => item.startTime === startTime)
          if (!slot) return
          const existing = entryMap.get(startTime)
          if (existing) {
            const optimistic = { ...existing, activity: content, thought: null, isSameAsPrevious: false }
            upsertEntry(optimistic)
            void updateEntry(existing.id, { activity: content, thought: null, isSameAsPrevious: false })
              .then((result) => {
                if (result.data) upsertEntry(result.data)
              })
                  .catch((err) => {
                    console.warn('Failed to sync entry update', err)
                  })
            return
          }

          const localEntry: TimeEntry = {
            id: `local-${dateKey}-${startTime}`,
            date: dateKey,
            startTime,
            endTime: slot.endTime,
            activity: content,
            thought: null,
            isSameAsPrevious: false,
          }
          upsertEntry(localEntry)
          void createEntry({
            date: dateKey,
            startTime,
            endTime: slot.endTime,
            activity: content,
            thought: null,
            isSameAsPrevious: false,
          })
            .then((result) => {
              if (result.data) upsertEntry(result.data)
            })
            .catch((error) => {
              console.warn('Failed to sync entry create', error)
            })
        })
      )
    } finally {
      setIsBatchSaving(false)
      clearSelection()
    }
  }

  const handleCopyPrevious = (startTime: string) => {
    const currentIndex = slots.findIndex((slot) => slot.startTime === startTime)
    if (currentIndex <= 0) return

    const previousSlot = slots[currentIndex - 1]
    const previousEntry = entryMap.get(previousSlot.startTime)
    if (!previousEntry || !previousEntry.activity.trim()) return

    const applyCopy = () => {
      const existing = entryMap.get(startTime)
      const payload = {
        activity: previousEntry.activity,
        thought: null,
        isSameAsPrevious: true,
      }

      if (existing) {
        const optimistic = { ...existing, ...payload }
        upsertEntry(optimistic)
        void updateEntry(existing.id, payload)
          .then((result) => {
            if (result.data) upsertEntry(result.data)
          })
          .catch((error) => {
            console.warn('Failed to sync entry update', error)
          })
        return
      }

      const localEntry: TimeEntry = {
        id: `local-${dateKey}-${startTime}`,
        date: dateKey,
        startTime,
        endTime: slots[currentIndex].endTime,
        ...payload,
      }
      upsertEntry(localEntry)
      void createEntry({
        date: dateKey,
        startTime,
        endTime: slots[currentIndex].endTime,
        ...payload,
      })
        .then((result) => {
          if (result.data) upsertEntry(result.data)
        })
        .catch((error) => {
          console.warn('Failed to sync entry create', error)
        })
    }

    const existing = entryMap.get(startTime)
    if (existing && existing.activity.trim()) {
      Alert.alert('覆盖当前内容？', '此时间块已有内容，是否使用上一条内容覆盖？', [
        { text: '取消', style: 'cancel' },
        { text: '覆盖', style: 'destructive', onPress: applyCopy },
      ])
      return
    }

    applyCopy()
  }

  return (
    <View style={styles.container}>
      <TopBar date={selectedDate} onPrev={handlePrevDay} onNext={handleNextDay} onToday={handleToday} showToday={isToday} />

      <View style={styles.listWrapper}>
        <View style={styles.timelineLine} />
        <FlatList
          data={slots}
          keyExtractor={(item) => `${dateKey}-${item.startTime}`}
          contentContainerStyle={styles.listContent}
          onScroll={(event) => {
            scrollOffset.current = event.nativeEvent.contentOffset.y
          }}
          scrollEventThrottle={16}
          renderItem={({ item }) => {
            const entry = entryMap.get(item.startTime)
            const isCurrent = isToday && currentSlot === item.startTime

            return (
              <TimeSlotCard
                startTime={item.startTime}
                isCurrent={isCurrent}
                entry={entry}
                isSelected={selectedSlots.includes(item.startTime)}
                onLayout={(start, layout) => {
                  slotLayouts.current[start] = layout
                }}
                onCopyPrevious={() => handleCopyPrevious(item.startTime)}
                onSave={async ({ activity, thought, isSameAsPrevious }) => {
                  const nextIsSame = isSameAsPrevious ?? entry?.isSameAsPrevious ?? false
                  if (entry) {
                    const optimistic = { ...entry, activity, thought, isSameAsPrevious: nextIsSame }
                    upsertEntry(optimistic)
                    void updateEntry(entry.id, { activity, thought, isSameAsPrevious: nextIsSame })
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
                      isSameAsPrevious: nextIsSame,
                    }
                    upsertEntry(localEntry)
                    void createEntry({
                      date: dateKey,
                      startTime: item.startTime,
                      endTime: item.endTime,
                      activity,
                      thought,
                      isSameAsPrevious: nextIsSame,
                    })
                      .then((result) => {
                        if (result.data) {
                          upsertEntry(result.data)
                        }
                      })
                      .catch((err) => {
                        console.warn('Failed to sync entry create', err)
                      })
                  }
                }}
                onDelete={async () => {
                  if (!entry) return
                  removeEntry(entry.id)
                  void deleteEntry(entry.id).catch((err) => {
                    console.warn('Failed to sync entry delete', err)
                  })
                }}
              />
            )
          }}
        />
        <View
          style={styles.selectionZone}
          pointerEvents="box-only"
          onStartShouldSetResponder={() => true}
          onStartShouldSetResponderCapture={() => true}
          onMoveShouldSetResponder={() => true}
          onMoveShouldSetResponderCapture={() => true}
          onResponderTerminationRequest={() => false}
          onResponderGrant={(event) => handleSelectStart(event.nativeEvent.locationY)}
          onResponderMove={(event) => handleSelectMove(event.nativeEvent.locationY)}
          onResponderRelease={handleSelectEnd}
          onResponderTerminate={handleSelectEnd}
        />

        {selectedSlots.length > 1 && (
          <View style={styles.batchBar}>
            <Text style={styles.batchLabel}>已选 {selectedSlots.length} 个时间段</Text>
            <TextInput
              value={batchActivity}
              onChangeText={setBatchActivity}
              placeholder="批量填写内容"
              placeholderTextColor={colors.textTertiary}
              style={styles.batchInput}
            />
            <View style={styles.batchActions}>
              <TouchableOpacity style={styles.batchCancel} onPress={clearSelection}>
                <Text style={styles.batchCancelText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.batchSave, !batchActivity.trim() ? styles.batchSaveDisabled : null]}
                onPress={handleBatchSave}
                disabled={!batchActivity.trim() || isBatchSaving}
              >
                <Text style={styles.batchSaveText}>{isBatchSaving ? '保存中...' : '批量保存'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
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
    paddingHorizontal: timelineLayout.listPaddingX,
    paddingVertical: 12,
    paddingBottom: 140,
  },
  listWrapper: {
    flex: 1,
  },
  timelineLine: {
    position: 'absolute',
    left: timelineLineLeft,
    top: 0,
    bottom: 0,
    width: timelineLayout.lineWidth,
    backgroundColor: colors.border,
  },
  selectionZone: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: timelineSelectionWidth,
    zIndex: 2,
    elevation: 2,
  },
  batchBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 72,
    backgroundColor: colors.bgSecondary,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    gap: 10,
  },
  batchLabel: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  batchInput: {
    backgroundColor: colors.bgTertiary,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: colors.textPrimary,
    fontSize: 14,
  },
  batchActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  batchCancel: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgTertiary,
  },
  batchCancelText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  batchSave: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: colors.accent,
  },
  batchSaveDisabled: {
    opacity: 0.6,
  },
  batchSaveText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
})
