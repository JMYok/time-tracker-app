import { apiFetch } from './client'

export interface AnalysisData {
  summary: string
  timeDistribution: Record<string, number>
  patterns: string[]
  insights: string[]
  focusScore: number
  highlights: string[]
  improvements: string[]
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

export const fetchDocuments = async (date: string) => {
  return apiFetch<{ success: boolean; data: SavedDocument[] }>(`/api/analysis-documents?date=${date}`)
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
