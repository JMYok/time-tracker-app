'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { useTimeline, type TimeSlot, type TimeEntry } from './useTimeline'
import { authFetch } from '@/lib/auth-client'
import { TimelineNavigation } from './TimelineNavigation'
import { TimeSlot as TimeSlotComponent } from './TimeSlot'

export function TimelineView() {
  const { timeSlots, selectedDate, isLoading, goToPreviousDay, goToNextDay, goToNow, refreshEntries, upsertEntry, removeEntry } = useTimeline()
  const containerRef = useRef<HTMLDivElement>(null)
  const currentSlotRef = useRef<HTMLDivElement>(null)
  const lastAutoScrollDateKeyRef = useRef<string | null>(null)
  const selectedDateKey = selectedDate.toISOString().split('T')[0]
  const [selectedSlots, setSelectedSlots] = useState<string[]>([])
  const [batchActivity, setBatchActivity] = useState('')
  const [isBatchSaving, setIsBatchSaving] = useState(false)
  const [isSelecting, setIsSelecting] = useState(false)
  const selectionTimerRef = useRef<number | null>(null)
  const selectionAnchorRef = useRef<number | null>(null)

  const timeColumnWidth = 76
  const dotSize = 10
  const lineLeft = timeColumnWidth - dotSize / 2

  // Handle entry changes - refresh data from server to prevent stale state
  const handleEntryChange = useCallback(async () => {
    await refreshEntries()
  }, [refreshEntries])

  const handleNavigationPrevious = useCallback(() => {
    goToPreviousDay()
  }, [goToPreviousDay])

  const handleNavigationNext = useCallback(() => {
    goToNextDay()
  }, [goToNextDay])

  const handleNavigationGoToNow = useCallback(() => {
    goToNow()
  }, [goToNow])

  useEffect(() => {
    setSelectedSlots([])
    setBatchActivity('')
  }, [selectedDateKey])

  // Auto-scroll to current time slot (only once per date, not during editing)
  useEffect(() => {
    const dateKey = selectedDate.toISOString().split('T')[0]
    if (lastAutoScrollDateKeyRef.current === dateKey) return

    if (currentSlotRef.current) {
      currentSlotRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
      lastAutoScrollDateKeyRef.current = dateKey
    }
  }, [selectedDate, timeSlots])

  // Handle request for previous entry
  const handlePreviousEntryRequest = useCallback(async (currentSlot: TimeSlot) => {
    const currentIndex = timeSlots.findIndex((slot) => slot.startTime === currentSlot.startTime)
    if (currentIndex <= 0) return null

    for (let index = currentIndex - 1; index >= 0; index -= 1) {
      const entry = timeSlots[index].entry
      if (entry && (entry.activity.trim() || entry.isSameAsPrevious)) {
        return {
          activity: entry.activity,
          thought: entry.thought,
          isSameAsPrevious: entry.isSameAsPrevious,
        }
      }
    }
    return null
  }, [timeSlots])

  const backfillSameAsPreviousUpwards = useCallback(async (startTime: string) => {
    const currentIndex = timeSlots.findIndex((slot) => slot.startTime === startTime)
    if (currentIndex <= 0) return

    const indices: number[] = []
    for (let index = currentIndex - 1; index >= 0; index -= 1) {
      const slot = timeSlots[index]
      const entry = slot.entry
      if (entry && (entry.activity.trim() || entry.isSameAsPrevious)) {
        break
      }
      indices.push(index)
    }

    if (indices.length === 0) return

    const payload = { activity: '', thought: null, isSameAsPrevious: true }
    await Promise.all(
      indices.map(async (index) => {
        const targetSlot = timeSlots[index]
        const existing = targetSlot.entry
        if (existing) {
          const optimistic = { ...existing, ...payload }
          upsertEntry(optimistic)
          const response = await authFetch(`/api/entries/${existing.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
          if (response.ok) {
            const result = await response.json()
            if (result?.data) {
              upsertEntry(result.data)
            }
          }
          return
        }

        const localEntry: TimeEntry = {
          id: `local-${selectedDateKey}-${targetSlot.startTime}`,
          date: selectedDateKey,
          startTime: targetSlot.startTime,
          endTime: targetSlot.endTime,
          ...payload,
        }
        upsertEntry(localEntry)
        const response = await authFetch('/api/entries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date: selectedDateKey,
            startTime: targetSlot.startTime,
            endTime: targetSlot.endTime,
            ...payload,
          }),
        })
        if (response.ok) {
          const result = await response.json()
          if (result?.data) {
            upsertEntry(result.data)
          }
        }
      })
    )
  }, [selectedDateKey, timeSlots, upsertEntry])

  const updateSelectionRange = useCallback((startIndex: number, currentIndex: number) => {
    const start = Math.min(startIndex, currentIndex)
    const end = Math.max(startIndex, currentIndex)
    const range = timeSlots.slice(start, end + 1).map((slot) => slot.startTime)
    setSelectedSlots(range)
  }, [timeSlots])

  const handleTimePointerDown = useCallback((index: number) => {
    if (selectionTimerRef.current) {
      window.clearTimeout(selectionTimerRef.current)
    }
    selectionTimerRef.current = window.setTimeout(() => {
      selectionAnchorRef.current = index
      setIsSelecting(true)
      updateSelectionRange(index, index)
    }, 250)
  }, [updateSelectionRange])

  const handleTimePointerEnter = useCallback((index: number) => {
    if (!isSelecting || selectionAnchorRef.current === null) return
    updateSelectionRange(selectionAnchorRef.current, index)
  }, [isSelecting, updateSelectionRange])

  const handlePointerUp = useCallback(() => {
    if (selectionTimerRef.current) {
      window.clearTimeout(selectionTimerRef.current)
      selectionTimerRef.current = null
    }
    if (isSelecting) {
      setIsSelecting(false)
    }
  }, [isSelecting])

  useEffect(() => {
    window.addEventListener('pointerup', handlePointerUp)
    return () => {
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [handlePointerUp])

  const clearSelection = () => {
    setSelectedSlots([])
    setBatchActivity('')
  }

  const handleBatchSave = useCallback(async () => {
    const content = batchActivity.trim()
    if (!content || isBatchSaving || selectedSlots.length === 0) return

    setIsBatchSaving(true)
    try {
      await Promise.all(
        selectedSlots.map(async (startTime) => {
          const slot = timeSlots.find((item) => item.startTime === startTime)
          if (!slot) return

          if (slot.entry) {
            const optimistic = { ...slot.entry, activity: content, thought: null, isSameAsPrevious: false }
            upsertEntry(optimistic)
            const response = await authFetch(`/api/entries/${slot.entry.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ activity: content, thought: null, isSameAsPrevious: false }),
            })
            if (response.ok) {
              const result = await response.json()
              if (result?.data) {
                upsertEntry(result.data)
              }
            }
            return
          }

          const localEntry: TimeEntry = {
            id: `local-${selectedDateKey}-${startTime}`,
            date: selectedDateKey,
            startTime,
            endTime: slot.endTime,
            activity: content,
            thought: null,
            isSameAsPrevious: false,
          }
          upsertEntry(localEntry)

          const response = await authFetch('/api/entries', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              date: selectedDateKey,
              startTime,
              endTime: slot.endTime,
              activity: content,
              thought: null,
              isSameAsPrevious: false,
            }),
          })
          if (response.ok) {
            const result = await response.json()
            if (result?.data) {
              upsertEntry(result.data)
            }
          }
        })
      )
    } finally {
      setIsBatchSaving(false)
      clearSelection()
    }
  }, [batchActivity, isBatchSaving, selectedSlots, selectedDateKey, timeSlots, upsertEntry])

  const clearCopiedChainFrom = useCallback(async (startTime: string) => {
    const startIndex = timeSlots.findIndex((slot) => slot.startTime === startTime)
    if (startIndex === -1) return

    const tasks: Promise<unknown>[] = []
    for (let index = startIndex + 1; index < timeSlots.length; index += 1) {
      const nextSlot = timeSlots[index]
      const nextEntry = nextSlot.entry
      if (!nextEntry || !nextEntry.isSameAsPrevious) break

      removeEntry(nextEntry.id)
      if (!nextEntry.id.startsWith('local-')) {
        tasks.push(
          authFetch(`/api/entries/${nextEntry.id}`, { method: 'DELETE' }).catch((error) => {
            console.warn('Failed to delete chained entry', error)
          })
        )
      }
    }

    if (tasks.length) {
      await Promise.all(tasks)
    }
  }, [removeEntry, timeSlots])

  if (false && isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#3B82F6] animate-pulse"></div>
          <div className="text-[#3A3A3A] text-[13px]">加载中...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-2xl mx-auto relative">
      {isLoading && (
        <div className="absolute left-0 right-0 top-2 flex justify-center pointer-events-none">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#0A0A0A]/80 border border-[#1A1A1A]">
            <div className="w-1.5 h-1.5 rounded-full bg-[#3B82F6] animate-pulse"></div>
            <div className="text-[#3A3A3A] text-[11px]">加载中...</div>
          </div>
        </div>
      )}
      {/* Navigation */}
      <TimelineNavigation
        selectedDate={selectedDate}
        onPrevious={handleNavigationPrevious}
        onNext={handleNavigationNext}
        onGoToNow={handleNavigationGoToNow}
      />

      {/* Timeline with vertical connecting line */}
      <div
        ref={containerRef}
        className="max-h-[calc(100vh-140px)] overflow-y-auto px-4 pb-4"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        <style jsx>{`
          div::-webkit-scrollbar {
            display: none;
          }
        `}</style>

        {/* Timeline Container */}
        <div className="relative">
          {/* Vertical Timeline Line */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-gradient-to-b from-transparent via-[#2A2A2A] to-transparent"
            style={{
              left: `${lineLeft}px`,
              background: 'linear-gradient(to bottom, transparent 0%, #2A2A2A 10%, #2A2A2A 90%, transparent 100%)'
            }}
          />

          {/* Time Slots */}
          <div className="flex flex-col gap-0 relative">
            {timeSlots.map((slot, index) => (
              <div
                key={`${selectedDateKey}-${slot.startTime}`}
                ref={slot.isCurrentSlot ? currentSlotRef : null}
                className="flex gap-4 items-stretch group relative"
              >
                {/* Timeline Node & Time Label */}
                <div
                  className="relative flex items-center select-none"
                  style={{ minWidth: `${timeColumnWidth}px` }}
                  onPointerDown={() => handleTimePointerDown(index)}
                  onPointerEnter={() => handleTimePointerEnter(index)}
                >
                  {/* Timeline Dot */}
                  <div className={`
                    absolute right-0 rounded-full border-2 transition-all duration-300
                    ${slot.isCurrentSlot
                      ? 'border-[#3B82F6] bg-[#1A1A1A] scale-125 shadow-lg shadow-blue-500/30'
                      : 'border-[#3A3A3A] bg-[#0A0A0A] group-hover:border-[#4A4A4A] group-hover:scale-110'
                    }
                  `}
                    style={{ width: `${dotSize}px`, height: `${dotSize}px`, transform: 'translateX(-50%)' }}
                  >
                    {/* Inner dot for current slot */}
                    {slot.isCurrentSlot && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-1 h-1 rounded-full bg-[#3B82F6] animate-pulse" />
                      </div>
                    )}
                  </div>

                  {/* Time Label */}
                  <div className={`
                    font-mono text-right pr-4
                    transition-all duration-300
                    ${slot.isCurrentSlot
                      ? 'text-[17px] font-bold text-[#3B82F6] py-5 tracking-tight'
                      : 'text-[15px] font-semibold text-[#5A5A5A] py-4 group-hover:text-[#7A7A7A] tracking-tight'
                    }
                  `}>
                    {slot.startTime}
                  </div>
                </div>

                {/* Content Card - Right Column */}
                <div className="flex-1 pt-1 pb-1">
                  <TimeSlotComponent
                    slot={slot}
                    dateKey={selectedDateKey}
                    isSelected={selectedSlots.includes(slot.startTime)}
                    onPreviousEntryRequest={() => handlePreviousEntryRequest(slot)}
                    onEntryChange={handleEntryChange}
                    onEntryUpsert={upsertEntry}
                    onEntryDelete={removeEntry}
                    onSameAsPreviousChainBreak={clearCopiedChainFrom}
                    onSameAsPreviousBackfill={backfillSameAsPreviousUpwards}
                  />
                </div>
              </div>
            ))}
          </div>

          {selectedSlots.length > 1 && (
            <div className="sticky bottom-4 mt-4 bg-[#141414] border border-[#262626] rounded-2xl p-3 flex flex-col gap-3 shadow-xl">
              <div className="text-[12px] text-[#737373]">已选 {selectedSlots.length} 个时间段</div>
              <textarea
                value={batchActivity}
                onChange={(e) => setBatchActivity(e.target.value)}
                placeholder="批量填写内容"
                rows={2}
                className="minimal-scrollbar w-full bg-[#1A1A1A] text-[#E5E5E5] placeholder-[#525252] text-[14px] outline-none rounded-lg p-2 resize-none overflow-y-auto"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={clearSelection}
                  className="px-3 py-2 text-[12px] text-[#737373] hover:text-[#E5E5E5] transition-colors bg-[#1A1A1A] rounded-xl"
                >
                  取消
                </button>
                <button
                  onClick={handleBatchSave}
                  disabled={!batchActivity.trim() || isBatchSaving}
                  className="px-3 py-2 text-[12px] bg-[#3B82F6] text-white rounded-xl hover:bg-[#2563EB] disabled:opacity-60 transition-colors"
                >
                  {isBatchSaving ? '保存中...' : '批量保存'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
