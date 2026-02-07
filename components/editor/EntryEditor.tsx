'use client'

import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

interface EntryEditorProps {
  activity: string
  thought: string
  onActivityChange: (value: string) => void
  onThoughtChange: (value: string) => void
  isSaving?: boolean
  lastSavedAt?: Date | null
  placeholder?: string
}

export function EntryEditor({
  activity,
  thought,
  onActivityChange,
  onThoughtChange,
  isSaving = false,
  lastSavedAt,
  placeholder = '你在做什么？'
}: EntryEditorProps) {
  const activityInputRef = useRef<HTMLInputElement>(null)
  const thoughtInputRef = useRef<HTMLTextAreaElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  // Handle tap outside to dismiss keyboard
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        // Blur active element to dismiss keyboard
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur()
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [])

  // Format last saved time
  const formatLastSaved = () => {
    if (!lastSavedAt) return null
    const now = new Date()
    const diff = now.getTime() - lastSavedAt.getTime()

    if (diff < 1000) return '刚刚保存'
    if (diff < 60000) return `${Math.floor(diff / 1000)}秒前保存`
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前保存`
    return '已保存'
  }

  return (
    <div
      ref={containerRef}
      className="flex flex-col gap-4"
    >
      {/* Activity Input */}
      <div className="flex flex-col gap-2">
        <input
          ref={activityInputRef}
          type="text"
          value={activity}
          onChange={(e) => onActivityChange(e.target.value)}
          placeholder={placeholder}
          className={cn(
            'w-full bg-[#141414] text-[#E5E5E5] placeholder-[#525252]',
            'px-0 py-3 text-base',
            'border-b-2 border-transparent',
            'transition-colors duration-200',
            'focus:outline-none focus:border-[#3B82F6]',
            'focus:placeholder-[#737373]'
          )}
        />
      </div>

      {/* Thought Input */}
      <div className="flex flex-col gap-2">
        <textarea
          ref={thoughtInputRef}
          value={thought}
          onChange={(e) => onThoughtChange(e.target.value)}
          placeholder="想法或备注（可选）..."
          rows={3}
          className={cn(
            'w-full bg-[#141414] text-[#E5E5E5] placeholder-[#525252]',
            'px-0 py-3 text-base resize-none',
            'border-b-2 border-transparent',
            'transition-colors duration-200',
            'focus:outline-none focus:border-[#3B82F6]',
            'focus:placeholder-[#737373]'
          )}
        />
      </div>

      {/* Save Status Indicator */}
      {(isSaving || lastSavedAt) && (
        <div className="flex items-center gap-2">
          {isSaving ? (
            <>
              <div className="w-1.5 h-1.5 rounded-full bg-[#3B82F6] animate-pulse" />
              <span className="text-xs text-[#737373]">保存中...</span>
            </>
          ) : lastSavedAt ? (
            <>
              <div className="w-1.5 h-1.5 rounded-full bg-[#525252]" />
              <span className="text-xs text-[#525252]">{formatLastSaved()}</span>
            </>
          ) : null}
        </div>
      )}
    </div>
  )
}
