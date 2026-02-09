const ANALYSIS_CACHE_PREFIX = 'time-tracker:analysis:'

export const buildAnalysisCacheKey = (date: string) => `${ANALYSIS_CACHE_PREFIX}${date}`

export const readAnalysisCache = (date: string) => {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(buildAnalysisCacheKey(date))
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export const writeAnalysisCache = (date: string, data: unknown) => {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(buildAnalysisCacheKey(date), JSON.stringify(data))
  } catch {
    // ignore cache write errors
  }
}
