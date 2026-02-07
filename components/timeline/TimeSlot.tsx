'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { TimeSlot as TimeSlotType, type TimeEntry } from './useTimeline'

// CRITICAL: Prevent infinite recursion in mutation queue
const MAX_RETRIES = 50

interface TimeSlotProps {
  slot: TimeSlotType
  onPreviousEntryRequest?: () => Promise<{ activity: string; thought: string | null } | null>
  onEntryChange?: () => Promise<void>
  onEntryUpsert?: (entry: TimeEntry) => void
  onEntryDelete?: (id: string) => void
  onEntrySave?: () => void
}

export function TimeSlot({
  slot,
  onPreviousEntryRequest,
  onEntryChange,
  onEntryUpsert,
  onEntryDelete,
  onEntrySave,
}: TimeSlotProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [activity, setActivity] = useState(slot.entry?.activity || '')
  const [thought, setThought] = useState(slot.entry?.thought || '')
  const [isSaving, setIsSaving] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const hasLocalDraftRef = useRef(false)
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isEditing) return

    if (slot.entry) {
      setActivity(slot.entry.activity || '')
      setThought(slot.entry.thought || '')
      hasLocalDraftRef.current = true
      return
    }

    if (!hasLocalDraftRef.current) {
      setActivity('')
      setThought('')
    }
  }, [slot.entry, isEditing])

  const activityInputRef = useRef<HTMLInputElement>(null)
  const thoughtInputRef = useRef<HTMLTextAreaElement>(null)
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null)

  const saveEntry = useCallback(
    async (retryCount: number = 0) => {
      if (isSaving) return
      if (retryCount >= MAX_RETRIES) {
        console.error('Save failed: Maximum retries exceeded')
        setIsSaving(false)
        return
      }

      setIsSaving(true)
      try {
        if (!activity.trim() && !thought.trim() && slot.entry?.id) {
          const deleteResponse = await fetch(`/api/entries/${slot.entry.id}`, {
            method: 'DELETE',
          })

          if (!deleteResponse.ok) {
            const error = await deleteResponse.text()
            console.error('Delete failed:', error)
            return
          }

          if (onEntryDelete) {
            onEntryDelete(slot.entry.id)
          } else if (onEntryChange) {
            await onEntryChange()
          }

          hasLocalDraftRef.current = false
          if (onEntrySave) {
            onEntrySave()
          }
          return
        }

        if (!activity.trim() && !thought.trim()) {
          return
        }

        const today = new Date().toISOString().split('T')[0]
        const url = slot.entry?.id ? `/api/entries/${slot.entry.id}` : '/api/entries'

        const response = await fetch(url, {
          method: slot.entry?.id ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(
            slot.entry?.id
              ? { activity, thought: thought || null }
              : { date: today, startTime: slot.startTime, endTime: slot.endTime, activity, thought: thought || null }
          ),
        })

        if (!response.ok) {
          const error = await response.text()
          console.error('Save failed:', error)
        } else {
          const result = await response.json()
          hasLocalDraftRef.current = true
          if (onEntryUpsert && result?.data) {
            onEntryUpsert(result.data)
          } else if (onEntryChange) {
            await onEntryChange()
          }
          if (onEntrySave) {
            onEntrySave()
          }
          setIsEditing(false)
        }
      } catch (error) {
        console.error('Save failed:', error)
      } finally {
        setIsSaving(false)
      }
    },
    [
      activity,
      thought,
      isSaving,
      slot.startTime,
      slot.endTime,
      slot.entry?.id,
      onEntryChange,
      onEntryUpsert,
      onEntryDelete,
      onEntrySave,
    ]
  )

  const handleActivityChange = (value: string) => {
    setActivity(value)
    hasLocalDraftRef.current = true
  }

  const handleThoughtChange = (value: string) => {
    setThought(value)
    hasLocalDraftRef.current = true
  }

  const handleStartEdit = () => {
    setIsEditing(true)
    activityInputRef.current?.focus()
  }

  const handleCancelEdit = useCallback(() => {
    setActivity(slot.entry?.activity || '')
    setThought(slot.entry?.thought || '')
    setIsEditing(false)
  }, [slot.entry?.activity, slot.entry?.thought])

  useEffect(() => {
    if (!isEditing) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        handleCancelEdit()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isEditing, handleCancelEdit])

  const handleMouseDown = () => {
    if (isEditing) return

    longPressTimerRef.current = setTimeout(() => {
      handleSameAsPrevious()
    }, 500)
  }

  const handleMouseUp = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
    }
  }

  const handleSameAsPrevious = async () => {
    if (!onPreviousEntryRequest) return

    const previous = await onPreviousEntryRequest()
    if (previous) {
      if (activity || thought) {
        setShowConfirm(true)
      } else {
        setActivity(previous.activity)
        setThought(previous.thought || '')
        saveEntry()
      }
    }
  }

  const handleConfirmOverwrite = () => {
    setShowConfirm(false)
    if (!onPreviousEntryRequest) return

    onPreviousEntryRequest().then((previous) => {
      if (previous) {
        setActivity(previous.activity)
        setThought(previous.thought || '')
        saveEntry()
      }
    })
  }

  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current)
    }
  }, [])

  const isCurrent = slot.isCurrentSlot
  const hasContent = Boolean(slot.entry || activity)

  return (
    <div
      ref={cardRef}
      className={`
        relative overflow-hidden rounded-xl border
        transition-all duration-200 ease-out
        ${isCurrent
          ? 'bg-[#1A1A1A] border-[#3B82F6]/40 shadow-lg shadow-blue-500/10 min-h-[80px]'
          : hasContent
            ? 'bg-[#141414] border-[#2A2A2A] shadow-md min-h-[64px]'
            : 'bg-[#0A0A0A] border-[#1A1A1A] min-h-[64px] hover:border-[#2A2A2A]'
        }
        ${isEditing ? 'shadow-xl border-[#3B82F6]/60' : ''}
      `}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleMouseDown}
      onTouchEnd={handleMouseUp}
    >
      <div
        className="py-3 px-4 cursor-text h-full flex flex-col justify-center"
        onClick={!isEditing ? handleStartEdit : undefined}
      >
        {isEditing ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#2A2A2A]">
              <span className="text-[11px] text-[#4A4A4A] uppercase tracking-wider font-medium">编辑模式</span>
              <button
                onClick={handleCancelEdit}
                className="px-3 py-1.5 text-[12px] text-[#737373] hover:text-[#E8E8E8] transition-colors rounded-lg hover:bg-[#1A1A1A] flex items-center gap-1.5"
              >
                <span className="text-[10px] px-1.5 py-0.5 bg-[#2A2A2A] rounded text-[#5A5A5A]">ESC</span>
                取消
              </button>
            </div>

            <div className="relative">
              <input
                ref={activityInputRef}
                type="text"
                value={activity}
                onChange={(e) => {
                  e.stopPropagation()
                  handleActivityChange(e.target.value)
                }}
                onFocus={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  e.stopPropagation()
                  if (e.key === 'Escape') {
                    e.preventDefault()
                    handleCancelEdit()
                  }
                }}
                placeholder="你在做什么？"
                className="w-full bg-transparent text-[15px] text-[#E8E8E8] placeholder-[#3A3A3A] font-medium outline-none leading-relaxed tracking-tight"
                style={{
                  caretColor: '#3B82F6',
                }}
              />
            </div>

            <div className="relative">
              <textarea
                ref={thoughtInputRef}
                value={thought}
                onChange={(e) => {
                  e.stopPropagation()
                  handleThoughtChange(e.target.value)
                }}
                onFocus={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  e.stopPropagation()
                  if (e.key === 'Escape') {
                    e.preventDefault()
                    handleCancelEdit()
                  }
                }}
                placeholder="想法或备注..."
                rows={2}
                className="w-full bg-transparent text-[14px] text-[#6B6B6B] placeholder-[#3A3A3A] outline-none resize-none leading-relaxed tracking-tight"
                style={{
                  caretColor: '#3B82F6',
                }}
              />
            </div>

            <div className="flex items-center justify-end pt-1">
              <button
                onClick={() => saveEntry()}
                className="flex items-center gap-2 bg-[#3B82F6] text-white px-3 py-2 rounded-xl shadow-lg shadow-blue-500/20 hover:bg-[#2563EB] active:scale-[0.98] transition-all"
                aria-label="保存"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9-7-9-7-9 7 9 7z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 12v7" />
                </svg>
                <span className="text-[12px] font-medium">保存</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-1.5">
            {activity ? (
              <p className="text-[15px] font-medium text-[#E8E8E8] leading-snug tracking-tight">
                {activity}
              </p>
            ) : (
              <p className={`text-[15px] ${isCurrent ? 'text-[#4A4A4A]' : 'text-[#1F1F1F]'}`}>
                {isCurrent ? '记录此刻...' : ''}
              </p>
            )}

            {thought && (
              <p className="text-[13px] text-[#6B6B6B] leading-snug tracking-tight">
                {thought}
              </p>
            )}

            {!activity && !isCurrent && (
              <p className="text-[13px] text-[#1A1A1A]">点击记录</p>
            )}
          </div>
        )}
      </div>

      {showConfirm && (
        <div className="absolute inset-0 bg-[#0A0A0A]/90 backdrop-blur-md rounded-2xl flex items-center justify-center z-10">
          <div className="px-5 py-4 w-full">
            <p className="text-[14px] text-[#E8E8E8] mb-4 text-center font-medium">覆盖已有内容？</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-2.5 text-[13px] text-[#737373] hover:text-[#E8E8E8] transition-colors bg-[#1A1A1A] rounded-xl"
              >
                取消
              </button>
              <button
                onClick={handleConfirmOverwrite}
                className="flex-1 py-2.5 text-[13px] bg-[#3B82F6] text-white rounded-xl hover:bg-[#2563EB] active:scale-[0.98] transition-all shadow-lg shadow-blue-500/20"
              >
                覆盖
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
