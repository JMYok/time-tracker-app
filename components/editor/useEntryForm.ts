'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { create } from 'zustand'

export interface EntryFormData {
  activity: string
  thought: string
}

interface EntryFormState {
  isOpen: boolean
  entryId: string | null
  date: string
  startTime: string
  endTime: string
  formData: EntryFormData
  setIsOpen: (isOpen: boolean) => void
  setEntry: (entry: { id: string | null; date: string; startTime: string; endTime: string; activity: string; thought: string | null }) => void
  updateFormData: (data: Partial<EntryFormData>) => void
  reset: () => void
}

const useFormStore = create<EntryFormState>((set) => ({
  isOpen: false,
  entryId: null,
  date: '',
  startTime: '',
  endTime: '',
  formData: { activity: '', thought: '' },
  setIsOpen: (isOpen) => set({ isOpen }),
  setEntry: (entry) => set({
    entryId: entry.id,
    date: entry.date,
    startTime: entry.startTime,
    endTime: entry.endTime,
    formData: { activity: entry.activity, thought: entry.thought || '' }
  }),
  updateFormData: (data) => set((state) => ({
    formData: { ...state.formData, ...data }
  })),
  reset: () => set({
    isOpen: false,
    entryId: null,
    date: '',
    startTime: '',
    endTime: '',
    formData: { activity: '', thought: '' }
  })
}))

interface UseEntryFormOptions {
  debounceMs?: number
  onSave?: (data: EntryFormData) => Promise<void>
}

export function useEntryForm(options: UseEntryFormOptions = {}) {
  const { debounceMs = 500, onSave } = options

  const {
    isOpen,
    entryId,
    date,
    startTime,
    endTime,
    formData,
    setIsOpen,
    setEntry,
    updateFormData,
    reset
  } = useFormStore()

  const [isSaving, setIsSaving] = useState(false)
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  // Debounced save function
  const saveFormData = useCallback(async (data: EntryFormData) => {
    if (!onSave || !data.activity.trim()) {
      return
    }

    setIsSaving(true)

    try {
      await onSave(data)
      setLastSavedAt(new Date())
    } catch (error) {
      console.error('Failed to save entry:', error)
    } finally {
      setIsSaving(false)
    }
  }, [onSave])

  // Trigger debounced save
  const triggerSave = useCallback((data: EntryFormData) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    saveTimeoutRef.current = setTimeout(() => {
      saveFormData(data)
    }, debounceMs)
  }, [debounceMs, saveFormData])

  // Open editor for a new or existing entry
  const openEditor = useCallback((
    entry: {
      id?: string | null
      date: string
      startTime: string
      endTime: string
      activity?: string
      thought?: string | null
    }
  ) => {
    setEntry({
      id: entry.id || null,
      date: entry.date,
      startTime: entry.startTime,
      endTime: entry.endTime,
      activity: entry.activity || '',
      thought: entry.thought || null
    })
    setIsOpen(true)
  }, [setEntry, setIsOpen])

  // Close editor
  const closeEditor = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    reset()
  }, [reset])

  // Update form field and trigger auto-save
  const updateField = useCallback(<K extends keyof EntryFormData>(
    field: K,
    value: EntryFormData[K]
  ) => {
    const newData = { ...formData, [field]: value }
    updateFormData({ [field]: value })

    // Only auto-save if activity is not empty
    if (newData.activity.trim()) {
      triggerSave(newData)
    }
  }, [formData, updateFormData, triggerSave])

  // Immediate save (for manual save button)
  const immediateSave = useCallback(async () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    await saveFormData(formData)
  }, [formData, saveFormData])

  return {
    // State
    isOpen,
    entryId,
    date,
    startTime,
    endTime,
    formData,
    isSaving,
    lastSavedAt,

    // Actions
    openEditor,
    closeEditor,
    updateField,
    immediateSave,
    setIsOpen,
    reset
  }
}

export { useFormStore }
