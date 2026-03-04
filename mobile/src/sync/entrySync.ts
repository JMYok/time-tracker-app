import type { TimeEntry } from '../api/entries'

export interface EntryUpsertPayload {
  date: string
  startTime: string
  endTime: string
  activity: string
  thought: string | null
  isSameAsPrevious?: boolean
}

interface BaseTask {
  id: string
  key: string
  retryCount: number
  nextRetryAt: number
  lastError?: string
  createdAt: number
}

export interface UpsertTask extends BaseTask {
  type: 'upsert'
  payload: EntryUpsertPayload
}

export interface DeleteTask extends BaseTask {
  type: 'delete'
  entryId: string
}

export type EntrySyncTask = UpsertTask | DeleteTask

export interface EntrySyncState {
  tasks: EntrySyncTask[]
}

export interface EntrySyncApi {
  upsertEntry: (payload: EntryUpsertPayload) => Promise<TimeEntry>
  deleteEntry: (id: string) => Promise<void>
}

export interface AppliedUpsert {
  type: 'upsert'
  key: string
  entry: TimeEntry
}

export interface AppliedDelete {
  type: 'delete'
  key: string
  entryId: string
}

export type AppliedSyncResult = AppliedUpsert | AppliedDelete

const RETRY_DELAYS_MS = [2000, 5000, 15000, 60000, 120000, 300000, 600000]

const buildKey = (date: string, startTime: string) => `${date}|${startTime}`

const createTaskId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`

const nextRetryAt = (now: number, retryCount: number) => {
  const idx = Math.max(0, Math.min(retryCount - 1, RETRY_DELAYS_MS.length - 1))
  return now + RETRY_DELAYS_MS[idx]
}

export const createInitialSyncState = (): EntrySyncState => ({ tasks: [] })

export const enqueueUpsertTask = (
  state: EntrySyncState,
  payload: EntryUpsertPayload,
  now: number
): EntrySyncState => {
  const key = buildKey(payload.date, payload.startTime)
  const nextTasks = state.tasks.filter((task) => task.key !== key)
  nextTasks.push({
    id: createTaskId(),
    type: 'upsert',
    key,
    payload,
    retryCount: 0,
    nextRetryAt: now,
    createdAt: now,
  })
  return { tasks: nextTasks }
}

export const enqueueDeleteTask = (
  state: EntrySyncState,
  entry: { id: string; date: string; startTime: string },
  now: number
): EntrySyncState => {
  const key = buildKey(entry.date, entry.startTime)

  if (entry.id.startsWith('local-')) {
    return {
      tasks: state.tasks.filter((task) => task.key !== key),
    }
  }

  const nextTasks = state.tasks.filter((task) => task.key !== key)
  nextTasks.push({
    id: createTaskId(),
    type: 'delete',
    key,
    entryId: entry.id,
    retryCount: 0,
    nextRetryAt: now,
    createdAt: now,
  })
  return { tasks: nextTasks }
}

export const getPendingUpserts = (state: EntrySyncState) => {
  const pending = new Map<string, EntryUpsertPayload>()
  state.tasks.forEach((task) => {
    if (task.type === 'upsert') {
      pending.set(task.key, task.payload)
    }
  })
  return pending
}

export const flushSyncTasks = async ({
  state,
  api,
  now,
}: {
  state: EntrySyncState
  api: EntrySyncApi
  now: number
}): Promise<{ state: EntrySyncState; applied: AppliedSyncResult[] }> => {
  const applied: AppliedSyncResult[] = []
  const nextTasks: EntrySyncTask[] = []

  const sortedTasks = [...state.tasks].sort((a, b) => a.createdAt - b.createdAt)

  for (const task of sortedTasks) {
    if (task.nextRetryAt > now) {
      nextTasks.push(task)
      continue
    }

    try {
      if (task.type === 'upsert') {
        const entry = await api.upsertEntry(task.payload)
        applied.push({ type: 'upsert', key: task.key, entry })
      } else {
        await api.deleteEntry(task.entryId)
        applied.push({ type: 'delete', key: task.key, entryId: task.entryId })
      }
    } catch (error) {
      const retryCount = task.retryCount + 1
      nextTasks.push({
        ...task,
        retryCount,
        nextRetryAt: nextRetryAt(now, retryCount),
        lastError: error instanceof Error ? error.message : String(error),
      })
    }
  }

  return {
    state: { tasks: nextTasks },
    applied,
  }
}
