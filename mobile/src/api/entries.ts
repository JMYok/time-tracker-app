import { apiFetch } from './client'

export interface TimeEntry {
  id: string
  date: string
  startTime: string
  endTime: string
  activity: string
  thought: string | null
  isSameAsPrevious?: boolean
}

export const fetchEntries = async (date: string) => {
  return apiFetch<{ success: boolean; entries: TimeEntry[] }>(`/api/entries?date=${date}`)
}

export const createEntry = async (payload: {
  date: string
  startTime: string
  endTime: string
  activity: string
  thought: string | null
}) => {
  return apiFetch<{ success: boolean; data: TimeEntry | null }>('/api/entries', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export const updateEntry = async (id: string, payload: { activity: string; thought: string | null }) => {
  return apiFetch<{ success: boolean; data: TimeEntry }>(`/api/entries/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export const deleteEntry = async (id: string) => {
  return apiFetch<{ success: boolean }>(`/api/entries/${id}`, {
    method: 'DELETE',
  })
}
