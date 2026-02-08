'use client'

import { useEffect, useCallback, useState } from 'react'
import { EntryEditor } from './EntryEditor'
import { useEntryForm } from './useEntryForm'
import { cn } from '@/lib/utils'
import { authFetch } from '@/lib/auth-client'

interface TimeSlotEditorProps {
  isOpen: boolean
  onClose: () => void
  slot?: {
    date: string
    startTime: string
    endTime: string
    entry?: {
      id: string
      activity: string
      thought: string | null
    } | null
  }
  onSave?: (data: {
    id?: string
    date: string
    startTime: string
    endTime: string
    activity: string
    thought: string | null
  }) => Promise<void>
}

export function TimeSlotEditor({
  isOpen,
  onClose,
  slot,
  onSave
}: TimeSlotEditorProps) {
  const [isLoadingPrevious, setIsLoadingPrevious] = useState(false)

  const {
    formData,
    isSaving,
    lastSavedAt,
    openEditor,
    updateField,
    reset
  } = useEntryForm({
    debounceMs: 500,
    onSave: async (data) => {
      if (!onSave || !slot) return

      await onSave({
        id: slot.entry?.id,
        date: slot.date,
        startTime: slot.startTime,
        endTime: slot.endTime,
        activity: data.activity,
        thought: data.thought || null
      })
    }
  })

  // Handle "Same as Previous" functionality
  const handleSameAsPrevious = useCallback(async () => {
    if (!slot) return

    setIsLoadingPrevious(true)
    try {
      const response = await authFetch(
        `/api/entries/previous?date=${slot.date}&startTime=${slot.startTime}`
      )
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          updateField('activity', result.data.activity)
          if (result.data.thought) {
            updateField('thought', result.data.thought)
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch previous entry:', error)
    } finally {
      setIsLoadingPrevious(false)
    }
  }, [slot, updateField])

  // Initialize form when slot changes
  useEffect(() => {
    if (isOpen && slot) {
      openEditor({
        id: slot.entry?.id || null,
        date: slot.date,
        startTime: slot.startTime,
        endTime: slot.endTime,
        activity: slot.entry?.activity || '',
        thought: slot.entry?.thought || null
      })
    }
  }, [isOpen, slot, openEditor])

  // Handle close
  const handleClose = useCallback(() => {
    reset()
    onClose()
  }, [reset, onClose])

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, handleClose])

  if (!isOpen || !slot) {
    return null
  }

  return (
    <div
      className={cn(
        'fixed inset-0 z-50',
        'flex items-end sm:items-center justify-center',
        'transition-opacity duration-200',
        isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
      )}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Editor Panel */}
      <div
        className={cn(
          'relative w-full max-w-lg',
          'bg-[#0A0A0A]',
          'rounded-t-2xl sm:rounded-2xl',
          'shadow-2xl',
          'max-h-[90vh] overflow-y-auto',
          'transform transition-transform duration-200',
          isOpen ? 'translate-y-0' : 'translate-y-full',
          'border-t sm:border border-[#262626]'
        )}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[#0A0A0A] border-b border-[#262626] px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#E5E5E5]">
                编辑时间块
              </h2>
              <p className="text-sm text-[#737373] mt-0.5">
                {slot.date} · {slot.startTime} - {slot.endTime}
              </p>
            </div>
            <button
              onClick={handleClose}
              className="p-2 -mr-2 text-[#737373] hover:text-[#E5E5E5] transition-colors"
              aria-label="关闭"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Editor Content */}
        <div className="px-6 py-5">
          {/* Quick Actions */}
          <div className="mb-4 flex items-center gap-2">
            <button
              onClick={handleSameAsPrevious}
              disabled={isLoadingPrevious}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium',
                'transition-colors duration-200',
                'bg-[#141414] text-[#737373]',
                'hover:bg-[#1A1A1A] hover:text-[#E5E5E5]',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {isLoadingPrevious ? (
                <>
                  <div className="w-3.5 h-3.5 rounded-full border-2 border-[#737373] border-t-transparent animate-spin" />
                  <span>加载中...</span>
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>与上一个相同</span>
                </>
              )}
            </button>
          </div>

          <EntryEditor
            activity={formData.activity}
            thought={formData.thought}
            onActivityChange={(value) => updateField('activity', value)}
            onThoughtChange={(value) => updateField('thought', value)}
            isSaving={isSaving}
            lastSavedAt={lastSavedAt}
            placeholder="你在做什么？"
          />
        </div>

        {/* Footer - Helper Text */}
        <div className="px-6 pb-5">
          <p className="text-xs text-[#525252]">
            输入内容会自动保存。点击外部或按 Esc 键关闭。
          </p>
        </div>
      </div>
    </div>
  )
}
