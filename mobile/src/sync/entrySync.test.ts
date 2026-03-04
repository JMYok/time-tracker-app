import test from 'node:test'
import assert from 'node:assert/strict'
import type { TimeEntry } from '../api/entries'
import {
  createInitialSyncState,
  enqueueDeleteTask,
  enqueueUpsertTask,
  flushSyncTasks,
  getPendingUpserts,
  type EntrySyncApi,
  type EntrySyncState,
} from './entrySync'

const buildPayload = (overrides: Partial<TimeEntry> = {}) => ({
  date: '2026-03-04',
  startTime: '09:00',
  endTime: '09:30',
  activity: 'Focus',
  thought: null,
  isSameAsPrevious: false,
  ...overrides,
})

test('enqueueUpsertTask dedupes by slot and keeps latest payload', () => {
  let state = createInitialSyncState()
  state = enqueueUpsertTask(state, buildPayload({ activity: 'A' }), 1000)
  state = enqueueUpsertTask(state, buildPayload({ activity: 'B' }), 1200)

  assert.equal(state.tasks.length, 1)
  assert.equal(state.tasks[0].type, 'upsert')
  if (state.tasks[0].type === 'upsert') {
    assert.equal(state.tasks[0].payload.activity, 'B')
  }
})

test('enqueueDeleteTask removes pending upsert for local-only entry', () => {
  let state = createInitialSyncState()
  state = enqueueUpsertTask(state, buildPayload(), 1000)
  state = enqueueDeleteTask(state, {
    id: 'local-2026-03-04-09:00',
    date: '2026-03-04',
    startTime: '09:00',
  }, 1200)

  assert.equal(state.tasks.length, 0)
})

test('flushSyncTasks retries failed task with backoff', async () => {
  let state = createInitialSyncState()
  state = enqueueUpsertTask(state, buildPayload(), 1000)

  const api: EntrySyncApi = {
    upsertEntry: async () => {
      throw new Error('network')
    },
    deleteEntry: async () => {
      throw new Error('should not call')
    },
  }

  const result = await flushSyncTasks({ state, api, now: 1000 })

  assert.equal(result.applied.length, 0)
  assert.equal(result.state.tasks.length, 1)
  assert.equal(result.state.tasks[0].retryCount, 1)
  assert.equal(result.state.tasks[0].nextRetryAt, 3000)
  assert.match(result.state.tasks[0].lastError || '', /network/)
})

test('flushSyncTasks applies upsert success and clears queue', async () => {
  let state: EntrySyncState = createInitialSyncState()
  state = enqueueUpsertTask(state, buildPayload(), 1000)

  const api: EntrySyncApi = {
    upsertEntry: async (payload) => ({
      id: 'srv-1',
      ...payload,
    }),
    deleteEntry: async () => undefined,
  }

  const result = await flushSyncTasks({ state, api, now: 1000 })

  assert.equal(result.state.tasks.length, 0)
  assert.equal(result.applied.length, 1)
  assert.equal(result.applied[0].type, 'upsert')
  assert.equal(result.applied[0].entry.id, 'srv-1')
})

test('getPendingUpserts returns payload map by date/start', () => {
  let state = createInitialSyncState()
  state = enqueueUpsertTask(state, buildPayload({ startTime: '09:00' }), 1000)
  state = enqueueUpsertTask(state, buildPayload({ startTime: '09:30' }), 1000)

  const pending = getPendingUpserts(state)
  assert.equal(pending.size, 2)
  assert.equal(pending.get('2026-03-04|09:00')?.activity, 'Focus')
})
