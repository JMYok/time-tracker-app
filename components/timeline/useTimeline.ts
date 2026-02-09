'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { authFetch } from '@/lib/auth-client'

// Format date as YYYY-MM-DD
const formatDateKey = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Generate all time slots for a day (00:00 to 23:30, 30-min increments)
const generateTimeSlots = (): Omit<TimeSlot, 'status' | 'entry' | 'isCurrentSlot'>[] => {
  const slots: Omit<TimeSlot, 'status' | 'entry' | 'isCurrentSlot'>[] = []
  for (let hour = 0; hour < 24; hour++) {
    for (const minute of [0, 30]) {
      const startTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
      const endHour = minute === 30 ? hour + 1 : hour
      const endMinute = minute === 30 ? 0 : 30
      const endTime = `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`
      slots.push({ startTime, endTime })
    }
  }
  return slots
}

export type TimeSlotStatus = 'recorded' | 'current' | 'future'

export interface TimeEntry {
  id: string
  date: string
  startTime: string
  endTime: string
  activity: string
  thought: string | null
  isSameAsPrevious: boolean
}

export interface TimeSlot {
  startTime: string
  endTime: string
  status: TimeSlotStatus
  entry?: TimeEntry
  isCurrentSlot: boolean
}

interface UseTimelineReturn {
  timeSlots: TimeSlot[]
  selectedDate: Date
  isLoading: boolean
  goToPreviousDay: () => void
  goToNextDay: () => void
  goToToday: () => void
  goToNow: () => void
  getCurrentSlotRef: () => { startTime: string; endTime: string } | null
  refreshEntries: () => Promise<void>
  upsertEntry: (entry: TimeEntry) => void
  removeEntry: (id: string) => void
}

export function useTimeline(initialDate?: Date): UseTimelineReturn {
  const [selectedDate, setSelectedDate] = useState(initialDate || new Date())
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentTime, setCurrentTime] = useState<Date>(new Date())

  // Update current time every 60 seconds to refresh current time slot
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000)

    return () => clearInterval(interval)
  }, [])

  // Fetch entries for selected date
  const fetchEntries = useCallback(async () => {
    setIsLoading(true)
    try {
      const dateKey = formatDateKey(selectedDate)
      const response = await authFetch(`/api/entries?date=${dateKey}`)
      if (response.ok) {
        const data = await response.json()
        setEntries(data.entries || [])
      }
    } catch (error) {
      console.error('Failed to fetch entries:', error)
      setEntries([])
    } finally {
      setIsLoading(false)
    }
  }, [selectedDate])

  // Fetch entries on date change
  useEffect(() => {
    fetchEntries()
  }, [fetchEntries])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const dateKey = formatDateKey(selectedDate)
    window.localStorage.setItem('time-tracker:selected-date', dateKey)
  }, [selectedDate])

  // Refresh entries function to call after mutations
  const refreshEntries = useCallback(async () => {
    await fetchEntries()
  }, [fetchEntries])

  const upsertEntry = useCallback((entry: TimeEntry) => {
    setEntries((prev) => {
      const existingIndex = prev.findIndex((item) => item.id === entry.id)
      if (existingIndex === -1) {
        const next = [...prev, entry]
        next.sort((a, b) => a.startTime.localeCompare(b.startTime))
        return next
      }
      const next = [...prev]
      next[existingIndex] = { ...prev[existingIndex], ...entry }
      return next
    })
  }, [])

  const removeEntry = useCallback((id: string) => {
    setEntries((prev) => prev.filter((entry) => entry.id !== id))
  }, [])

  // Get current time slot
  const getCurrentTimeSlot = useCallback((): { startTime: string; endTime: string } | null => {
    const currentHour = currentTime.getHours()
    const currentMinute = currentTime.getMinutes()

    // Round down to nearest 30 minutes
    const slotMinute = currentMinute < 30 ? 0 : 30
    const startTime = `${String(currentHour).padStart(2, '0')}:${String(slotMinute).padStart(2, '0')}`

    const endHour = slotMinute === 30 ? (currentHour + 1) % 24 : currentHour
    const endMinute = slotMinute === 30 ? 0 : 30
    const endTime = `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`

    return { startTime, endTime }
  }, [currentTime])

  // Match entries with time slots and determine status
  const timeSlots = useMemo(() => {
    const baseSlots = generateTimeSlots()
    const currentSlot = getCurrentTimeSlot()
    const isToday = formatDateKey(currentTime) === formatDateKey(selectedDate)

    return baseSlots.map((slot) => {
      const entry = entries.find(e => e.startTime === slot.startTime)
      const isCurrentSlot = isToday && currentSlot?.startTime === slot.startTime

      let status: TimeSlotStatus
      if (isCurrentSlot) {
        status = 'current'
      } else if (entry) {
        status = 'recorded'
      } else if (isToday && isTimeSlotInFuture(slot.startTime, currentTime)) {
        status = 'future'
      } else {
        status = 'future'
      }

      return {
        ...slot,
        status,
        entry,
        isCurrentSlot
      }
    })
  }, [entries, selectedDate, currentTime, getCurrentTimeSlot])

  // Navigation functions
  const goToPreviousDay = () => {
    const newDate = new Date(selectedDate)
    newDate.setDate(newDate.getDate() - 1)
    setSelectedDate(newDate)
  }

  const goToNextDay = () => {
    const newDate = new Date(selectedDate)
    newDate.setDate(newDate.getDate() + 1)
    setSelectedDate(newDate)
  }

  const goToToday = () => {
    setSelectedDate(new Date())
  }

  const goToNow = () => {
    setSelectedDate(new Date())
  }

  const getCurrentSlotRef = () => getCurrentTimeSlot()

  return {
    timeSlots,
    selectedDate,
    isLoading,
    goToPreviousDay,
    goToNextDay,
    goToToday,
    goToNow,
    getCurrentSlotRef,
    refreshEntries,
    upsertEntry,
    removeEntry
  }
}

// Helper function to check if a time slot is in the future
function isTimeSlotInFuture(slotStartTime: string, currentDate: Date): boolean {
  const [hour, minute] = slotStartTime.split(':').map(Number)
  const slotTime = new Date(currentDate)
  slotTime.setHours(hour, minute, 0, 0)
  return slotTime > currentDate
}
