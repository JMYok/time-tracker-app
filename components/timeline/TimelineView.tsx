'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { useTimeline, type TimeSlot } from './useTimeline'
import { TimelineNavigation } from './TimelineNavigation'
import { TimeSlot as TimeSlotComponent } from './TimeSlot'

interface TimelineViewProps {
  onSlotClick?: (slot: TimeSlot) => void
}

export function TimelineView({ onSlotClick }: TimelineViewProps) {
  const { timeSlots, selectedDate, isLoading, goToPreviousDay, goToNextDay, goToToday, goToNow, refreshEntries, upsertEntry, removeEntry } = useTimeline()
  const containerRef = useRef<HTMLDivElement>(null)
  const currentSlotRef = useRef<HTMLDivElement>(null)
  const lastAutoScrollDateKeyRef = useRef<string | null>(null)
  const selectedDateKey = selectedDate.toISOString().split('T')[0]

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

  const handleNavigationToday = useCallback(() => {
    goToToday()
  }, [goToToday])

  const handleNavigationGoToNow = useCallback(() => {
    goToNow()
  }, [goToNow])

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
    const today = new Date().toISOString().split('T')[0]
    const date = selectedDate.toISOString().split('T')[0]

    const response = await fetch(
      `/api/entries/previous?date=${date}&startTime=${currentSlot.startTime}`
    )

    if (response.ok) {
      const result = await response.json()
      if (result.success && result.data) {
        return {
          activity: result.data.activity,
          thought: result.data.thought,
        }
      }
    }
    return null
  }, [selectedDate])

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
        onToday={handleNavigationToday}
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
            className="absolute left-[70px] top-0 bottom-0 w-0.5 bg-gradient-to-b from-transparent via-[#2A2A2A] to-transparent"
            style={{
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
                <div className="relative flex items-center" style={{ minWidth: '70px' }}>
                  {/* Timeline Dot */}
                  <div className={`
                    absolute right-0 w-2.5 h-2.5 rounded-full border-2 transition-all duration-300
                    ${slot.isCurrentSlot
                      ? 'border-[#3B82F6] bg-[#1A1A1A] scale-125 shadow-lg shadow-blue-500/30'
                      : 'border-[#3A3A3A] bg-[#0A0A0A] group-hover:border-[#4A4A4A] group-hover:scale-110'
                    }
                    translate-x-1/2
                  `} style={{ transform: 'translateX(-50%)' }}>
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
                    onPreviousEntryRequest={() => handlePreviousEntryRequest(slot)}
                    onEntryChange={handleEntryChange}
                    onEntryUpsert={upsertEntry}
                    onEntryDelete={removeEntry}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
