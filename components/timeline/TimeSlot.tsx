'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { TimeSlot as TimeSlotType, type TimeEntry } from './useTimeline'
import { authFetch } from '@/lib/auth-client'

// CRITICAL: Prevent infinite recursion in mutation queue
const MAX_RETRIES = 50

interface TimeSlotProps {
  slot: TimeSlotType
  dateKey: string
  isSelected?: boolean
  onPreviousEntryRequest?: () => Promise<{ activity: string; thought: string | null; isSameAsPrevious?: boolean } | null>
  onEntryChange?: () => Promise<void>
  onEntryUpsert?: (entry: TimeEntry) => void
  onEntryDelete?: (id: string) => void
  onEntrySave?: () => void
  onSameAsPreviousChainBreak?: (startTime: string) => void
}

export function TimeSlot({
  slot,
  dateKey,
  isSelected,
  onPreviousEntryRequest,
  onEntryChange,
  onEntryUpsert,
  onEntryDelete,
  onEntrySave,
  onSameAsPreviousChainBreak,
}: TimeSlotProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [activity, setActivity] = useState(slot.entry?.activity || slot.entry?.thought || '')
  const [isSameAsPrevious, setIsSameAsPrevious] = useState(Boolean(slot.entry?.isSameAsPrevious))
  const [isSaving, setIsSaving] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const hasLocalDraftRef = useRef(false)
  const cardRef = useRef<HTMLDivElement>(null)
  const pendingSameRef = useRef(false)

  useEffect(() => {
    if (isEditing) return

    if (slot.entry) {
      setActivity(slot.entry.activity || slot.entry.thought || '')
      setIsSameAsPrevious(Boolean(slot.entry.isSameAsPrevious))
      hasLocalDraftRef.current = true
      return
    }

    if (!hasLocalDraftRef.current) {
      setActivity('')
      setIsSameAsPrevious(false)
    }
  }, [slot.entry, isEditing])

  const activityInputRef = useRef<HTMLTextAreaElement>(null)
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null)

  const saveEntry = useCallback(
    async (
      retryCount: number = 0,
      overrides?: { activity?: string; isSameAsPrevious?: boolean }
    ) => {
      if (isSaving) return
      if (retryCount >= MAX_RETRIES) {
        console.error('Save failed: Maximum retries exceeded')
        setIsSaving(false)
        return
      }

      const activityToSave = (overrides?.activity ?? activity).trim()
      const sameAsPrevious = overrides?.isSameAsPrevious ?? isSameAsPrevious
      const hadSameAsPrevious = Boolean(slot.entry?.isSameAsPrevious)

      setIsSaving(true)
      try {
        if (!activityToSave && slot.entry?.id && !sameAsPrevious) {
          const deleteResponse = await authFetch(`/api/entries/${slot.entry.id}`, {
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
          setIsSameAsPrevious(false)
          if (onEntrySave) {
            onEntrySave()
          }
          if (onSameAsPreviousChainBreak) {
            onSameAsPreviousChainBreak(slot.startTime)
          }
          return
        }

        if (!activityToSave && !sameAsPrevious) {
          return
        }

        const url = slot.entry?.id ? `/api/entries/${slot.entry.id}` : '/api/entries'

        const response = await authFetch(url, {
          method: slot.entry?.id ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(
            slot.entry?.id
              ? { activity: activityToSave, thought: null, isSameAsPrevious: sameAsPrevious }
              : {
                  date: dateKey,
                  startTime: slot.startTime,
                  endTime: slot.endTime,
                  activity: activityToSave,
                  thought: null,
                  isSameAsPrevious: sameAsPrevious,
                }
          ),
        })

        if (!response.ok) {
          const error = await response.text()
          console.error('Save failed:', error)
        } else {
          const result = await response.json()
          hasLocalDraftRef.current = true
          setIsSameAsPrevious(sameAsPrevious)
          if (onEntryUpsert && result?.data) {
            onEntryUpsert(result.data)
          } else if (onEntryChange) {
            await onEntryChange()
          }
          if (onEntrySave) {
            onEntrySave()
          }
          if (hadSameAsPrevious && !sameAsPrevious && onSameAsPreviousChainBreak) {
            onSameAsPreviousChainBreak(slot.startTime)
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
      isSaving,
      isSameAsPrevious,
      dateKey,
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
    if (isSameAsPrevious) {
      setIsSameAsPrevious(false)
    }
    hasLocalDraftRef.current = true
  }

  const handleStartEdit = () => {
    if (isSameAsPrevious) {
      setIsSameAsPrevious(false)
    }
    setIsEditing(true)
    activityInputRef.current?.focus()
  }

  const handleCancelEdit = useCallback(() => {
    setActivity(slot.entry?.activity || slot.entry?.thought || '')
    setIsSameAsPrevious(Boolean(slot.entry?.isSameAsPrevious))
    setIsEditing(false)
  }, [slot.entry?.activity, slot.entry?.thought, slot.entry?.isSameAsPrevious])

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
      const hasPrevious = Boolean(previous.activity?.trim() || previous.thought?.trim() || previous.isSameAsPrevious)
      if (!hasPrevious) return
      if (activity) {
        pendingSameRef.current = true
        setShowConfirm(true)
      } else {
        setActivity('')
        setIsSameAsPrevious(true)
        hasLocalDraftRef.current = true
        pendingSameRef.current = false
        void saveEntry(0, { activity: '', isSameAsPrevious: true })
      }
    }
  }

  const handleConfirmOverwrite = () => {
    setShowConfirm(false)
    if (!pendingSameRef.current) return
    setActivity('')
    setIsSameAsPrevious(true)
    hasLocalDraftRef.current = true
    pendingSameRef.current = false
    void saveEntry(0, { activity: '', isSameAsPrevious: true })
  }

  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current)
    }
  }, [])

  const isCurrent = slot.isCurrentSlot
  const hasContent = Boolean(slot.entry || activity)
  const sameAsPrevious = (isSameAsPrevious || Boolean(slot.entry?.isSameAsPrevious)) && !isEditing

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
        ${sameAsPrevious && !isCurrent ? 'border-[#4C3A6B] bg-[#1C1529]' : ''}
        ${isSelected ? 'border-[#3B82F6] bg-[#101318]' : ''}
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
              <textarea
                ref={activityInputRef}
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
                placeholder="\u4f60\u5728\u505a\u4ec0\u4e48\uff1f"
                rows={4}
                className="minimal-scrollbar w-full bg-transparent text-[15px] text-[#E8E8E8] placeholder-[#3A3A3A] font-medium outline-none leading-relaxed tracking-tight resize-none overflow-y-auto min-h-[96px] max-h-[96px]"
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
            {sameAsPrevious ? (
              <p className="text-[14px] text-[#8D80A8] font-medium tracking-tight">同上</p>
            ) : activity ? (
              <p className="text-[15px] font-medium text-[#E8E8E8] leading-snug tracking-tight">
                {activity}
              </p>
            ) : (
              <p className={`text-[15px] ${isCurrent ? 'text-[#4A4A4A]' : 'text-[#1F1F1F]'}`}>
                {isCurrent ? '记录此刻...' : ''}
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
