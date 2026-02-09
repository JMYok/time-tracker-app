import { apiFetch } from './client'

export interface AnalysisData {
  summary: string
  dailyNarrative?: string
  timeDistribution: Record<string, number>
  energyMoodCurve?: Record<string, string>
  keyEvents?: string[]
  patterns: string[]
  insights: string[]
  focusScore: number
  highlights: string[]
  improvements: string[]
  reflectionQuestions?: string[]
  reflectionInspiration?: string[]
}

export const analyzeDay = async (date: string) => {
  return apiFetch<{ success: boolean; data: AnalysisData }>(`/api/analyze`, {
    method: 'POST',
    body: JSON.stringify({ date }),
  })
}

export interface SavedDocument {
  id: string
  content: string
  sourceDate?: string | null
  createdAt: string
}

export interface DocumentsQuery {
  date?: string
  from?: string
  to?: string
  q?: string
  page?: number
  pageSize?: number
}

export interface DocumentsResponse {
  success: boolean
  data: SavedDocument[]
  meta?: { total: number; page: number; pageSize: number }
}

export const fetchDocuments = async (date: string) => {
  return apiFetch<DocumentsResponse>(`/api/analysis-documents?date=${date}`)
}

export const fetchAllDocuments = async (params: DocumentsQuery = {}) => {
  const searchParams = new URLSearchParams()
  if (params.date) searchParams.set('date', params.date)
  if (params.from) searchParams.set('from', params.from)
  if (params.to) searchParams.set('to', params.to)
  if (params.q) searchParams.set('q', params.q)
  if (params.page) searchParams.set('page', String(params.page))
  if (params.pageSize) searchParams.set('pageSize', String(params.pageSize))
  const query = searchParams.toString()
  return apiFetch<DocumentsResponse>(`/api/analysis-documents${query ? `?${query}` : ''}`)
}

export const saveDocument = async (payload: { date: string; content: string }) => {
  return apiFetch<{ success: boolean; data: SavedDocument }>(`/api/analysis-documents`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export const deleteDocument = async (id: string) => {
  return apiFetch<{ success: boolean }>(`/api/analysis-documents/${id}`, {
    method: 'DELETE',
  })
}

export const analyzeRange = async (range: '30d' | '365d') => {
  return apiFetch<{ success: boolean; data: { content: string } }>(`/api/analysis-documents/summary`, {
    method: 'POST',
    body: JSON.stringify({ range }),
  })
}
