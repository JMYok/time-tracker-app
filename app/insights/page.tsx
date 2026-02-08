'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface AnalysisData {
  summary: string
  timeDistribution: Record<string, number>
  patterns: string[]
  insights: string[]
  focusScore: number
  highlights: string[]
  improvements: string[]
}

interface SavedDocument {
  id: string
  content: string
  sourceDate?: string | null
  createdAt: string
}

export default function InsightsPage() {
  const router = useRouter()
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisDraft, setAnalysisDraft] = useState<AnalysisData | null>(null)
  const [analysisError, setAnalysisError] = useState<string | null>(null)

  const [savedDocs, setSavedDocs] = useState<SavedDocument[]>([])
  const [docsLoading, setDocsLoading] = useState(false)
  const [docsError, setDocsError] = useState<string | null>(null)
  const [isSavingDoc, setIsSavingDoc] = useState(false)

  const [rangeSummary, setRangeSummary] = useState<string | null>(null)
  const [rangeLoading, setRangeLoading] = useState(false)
  const [rangeError, setRangeError] = useState<string | null>(null)

  const loadSavedDocs = useCallback(async () => {
    setDocsLoading(true)
    setDocsError(null)

    try {
      const response = await fetch(`/api/analysis-documents?date=${date}`)
      const result = await response.json()
      if (result.success) {
        setSavedDocs(result.data || [])
      } else {
        setSavedDocs([])
        setDocsError(result.error || '获取文档失败')
      }
    } catch (error) {
      console.error('Load documents error:', error)
      setSavedDocs([])
      setDocsError('网络错误，请稍后重试')
    } finally {
      setDocsLoading(false)
    }
  }, [date])

  useEffect(() => {
    loadSavedDocs()
  }, [loadSavedDocs])

  const analyzeDay = async () => {
    setIsAnalyzing(true)
    setAnalysisError(null)
    setAnalysisDraft(null)

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date }),
      })

      const result = await response.json()

      if (result.success) {
        setAnalysisDraft(result.data)
      } else {
        const message = result.error || '分析失败'
        if (message === 'No entries found for this date') {
          setAnalysisError('今天还没有记录，先记几条再分析。')
        } else {
          setAnalysisError(message)
        }
      }
    } catch (err) {
      console.error('Analysis error:', err)
      setAnalysisError('网络错误，请稍后重试')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const analysisToMarkdown = (analysis: AnalysisData) => {
    const lines: string[] = []

    lines.push(`# ${date} AI 分析`)
    lines.push('')
    lines.push('## 总结')
    lines.push(analysis.summary || '')
    lines.push('')
    lines.push('## 洞察')
    if (analysis.insights.length) {
      analysis.insights.forEach((item) => lines.push(`- ${item}`))
    } else {
      lines.push('- 暂无')
    }
    lines.push('')
    lines.push('## 做得好的点')
    if (analysis.highlights.length) {
      analysis.highlights.forEach((item) => lines.push(`- ${item}`))
    } else {
      lines.push('- 暂无')
    }
    lines.push('')
    lines.push('## 改进建议')
    if (analysis.improvements.length) {
      analysis.improvements.forEach((item) => lines.push(`- ${item}`))
    } else {
      lines.push('- 暂无')
    }
    lines.push('')
    lines.push('## 时间分布（小时）')
    Object.entries(analysis.timeDistribution || {}).forEach(([key, value]) => {
      lines.push(`- ${key}: ${typeof value === 'number' ? value.toFixed(1) : value}`)
    })

    return lines.join('\n')
  }

  const saveDocument = async () => {
    if (!analysisDraft || isSavingDoc) return
    setIsSavingDoc(true)

    try {
      const content = analysisToMarkdown(analysisDraft)
      const response = await fetch('/api/analysis-documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, content }),
      })

      const result = await response.json()
      if (result.success) {
        await loadSavedDocs()
      } else {
        setAnalysisError(result.error || '保存失败')
      }
    } catch (error) {
      console.error('Save document error:', error)
      setAnalysisError('网络错误，请稍后重试')
    } finally {
      setIsSavingDoc(false)
    }
  }

  const deleteDocument = async (id: string) => {
    try {
      const response = await fetch(`/api/analysis-documents/${id}`, {
        method: 'DELETE',
      })
      const result = await response.json()
      if (result.success) {
        await loadSavedDocs()
      } else {
        setDocsError(result.error || '删除失败')
      }
    } catch (error) {
      console.error('Delete document error:', error)
      setDocsError('网络错误，请稍后重试')
    }
  }

  const analyzeRange = async (range: '30d' | '365d') => {
    setRangeLoading(true)
    setRangeError(null)
    setRangeSummary(null)

    try {
      const response = await fetch('/api/analysis-documents/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ range }),
      })
      const result = await response.json()

      if (result.success) {
        setRangeSummary(result.data?.content || '')
      } else {
        setRangeError(result.error || '分析失败')
      }
    } catch (error) {
      console.error('Range analysis error:', error)
      setRangeError('网络错误，请稍后重试')
    } finally {
      setRangeLoading(false)
    }
  }

  const formatCreatedAt = (value: string) => {
    const dateValue = new Date(value)
    if (Number.isNaN(dateValue.getTime())) return value
    return dateValue.toLocaleString('zh-CN', { hour12: false })
  }

  const hasSavedDocs = savedDocs.length > 0

  return (
    <main className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-bg-secondary border-b border-border-primary">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 -ml-2 text-text-secondary hover:text-text-primary"
              aria-label="返回"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-lg font-semibold text-text-primary">AI 洞察</h1>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Date Selection */}
        <div className="bg-bg-secondary rounded-xl border border-border-primary p-4">
          <label htmlFor="date" className="block text-sm text-text-secondary mb-2">
            选择日期
          </label>
          <input
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full bg-bg-tertiary text-text-primary px-4 py-2.5 rounded-lg border border-border-primary focus:outline-none focus:border-accent-primary"
          />
          <div className="grid grid-cols-2 gap-3 mt-3">
            <button
              onClick={analyzeDay}
              disabled={isAnalyzing}
              className="w-full bg-accent-primary text-white px-6 py-3 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
            >
              {isAnalyzing ? '分析中...' : '分析这一天'}
            </button>
            <button
              onClick={saveDocument}
              disabled={!analysisDraft || isSavingDoc}
              className="w-full bg-bg-tertiary text-text-primary px-6 py-3 rounded-lg font-medium border border-border-primary disabled:opacity-50 disabled:cursor-not-allowed hover:bg-bg-secondary transition-colors"
            >
              {isSavingDoc ? '保存中...' : '保存文档'}
            </button>
          </div>
        </div>

        {/* Saved Documents */}
        <div className="bg-bg-secondary rounded-xl border border-border-primary p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-medium text-text-primary">已保存文档</h2>
            <div className="text-xs text-text-tertiary">
              {docsLoading ? '加载中...' : hasSavedDocs ? `${savedDocs.length} 条` : '0 条'}
            </div>
          </div>

          {docsError && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-3">
              <p className="text-red-400 text-sm">{docsError}</p>
            </div>
          )}

          {!docsLoading && !hasSavedDocs && !docsError && (
            <div className="text-sm text-text-tertiary">暂无已保存文档</div>
          )}

          <div className="space-y-3">
            {savedDocs.map((doc) => (
              <div key={doc.id} className="border border-border-primary rounded-lg bg-bg-tertiary p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-text-tertiary">{formatCreatedAt(doc.createdAt)}</span>
                  <button
                    onClick={() => deleteDocument(doc.id)}
                    className="text-xs text-red-400 hover:text-red-300 transition-colors"
                  >
                    删除
                  </button>
                </div>
                <div className="text-sm text-text-secondary whitespace-pre-wrap">
                  {doc.content}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Range Analysis */}
        <div className="bg-bg-secondary rounded-xl border border-border-primary p-4">
          <h2 className="text-base font-medium text-text-primary mb-3">文档回顾</h2>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => analyzeRange('30d')}
              disabled={rangeLoading}
              className="w-full bg-bg-tertiary text-text-primary px-4 py-2.5 rounded-lg border border-border-primary disabled:opacity-50 disabled:cursor-not-allowed hover:bg-bg-secondary transition-colors"
            >
              最近30天
            </button>
            <button
              onClick={() => analyzeRange('365d')}
              disabled={rangeLoading}
              className="w-full bg-bg-tertiary text-text-primary px-4 py-2.5 rounded-lg border border-border-primary disabled:opacity-50 disabled:cursor-not-allowed hover:bg-bg-secondary transition-colors"
            >
              最近一年
            </button>
          </div>

          {rangeError && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mt-3">
              <p className="text-red-400 text-sm">{rangeError}</p>
            </div>
          )}

          {rangeSummary && (
            <div className="mt-3 border border-border-primary rounded-lg bg-bg-tertiary p-3">
              <div className="text-sm text-text-secondary whitespace-pre-wrap">
                {rangeSummary}
              </div>
            </div>
          )}
        </div>

        {/* Analysis Draft */}
        {analysisError && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
            <p className="text-red-400 text-sm">{analysisError}</p>
          </div>
        )}

        {analysisDraft && (
          <div className="space-y-4">
            <div className="bg-bg-secondary rounded-xl border border-border-primary p-4">
              <h2 className="text-base font-medium text-text-primary mb-2">总结</h2>
              <p className="text-text-secondary text-sm leading-relaxed whitespace-pre-wrap">
                {analysisDraft.summary}
              </p>
            </div>

            <div className="bg-bg-secondary rounded-xl border border-border-primary p-4">
              <h2 className="text-base font-medium text-text-primary mb-3">专注度评分</h2>
              <div className="flex items-center gap-4">
                <div className="text-4xl font-bold text-accent-primary">
                  {analysisDraft.focusScore}
                </div>
                <div className="flex-1 h-2 bg-bg-tertiary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent-primary transition-all duration-500"
                    style={{ width: `${analysisDraft.focusScore}%` }}
                  />
                </div>
              </div>
            </div>

            {Object.keys(analysisDraft.timeDistribution).length > 0 && (
              <div className="bg-bg-secondary rounded-xl border border-border-primary p-4">
                <h2 className="text-base font-medium text-text-primary mb-3">时间分布</h2>
                <div className="space-y-2">
                  {Object.entries(analysisDraft.timeDistribution).map(([category, hours]) => (
                    <div key={category} className="flex items-center justify-between">
                      <span className="text-text-secondary text-sm">{category}</span>
                      <span className="text-text-primary text-sm font-medium">
                        {typeof hours === 'number' ? `${hours.toFixed(1)} 小时` : hours}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {analysisDraft.highlights.length > 0 && (
              <div className="bg-bg-secondary rounded-xl border border-border-primary p-4">
                <h2 className="text-base font-medium text-text-primary mb-3">做得好的点</h2>
                <ul className="space-y-2">
                  {analysisDraft.highlights.map((highlight, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-green-500 mt-0.5">✓</span>
                      <span className="text-text-secondary text-sm">{highlight}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {analysisDraft.insights.length > 0 && (
              <div className="bg-bg-secondary rounded-xl border border-border-primary p-4">
                <h2 className="text-base font-medium text-text-primary mb-3">洞察</h2>
                <ul className="space-y-2">
                  {analysisDraft.insights.map((insight, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-accent-primary mt-0.5">•</span>
                      <span className="text-text-secondary text-sm">{insight}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {analysisDraft.improvements.length > 0 && (
              <div className="bg-bg-secondary rounded-xl border border-border-primary p-4">
                <h2 className="text-base font-medium text-text-primary mb-3">改进建议</h2>
                <ul className="space-y-2">
                  {analysisDraft.improvements.map((improvement, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-blue-500 mt-0.5">→</span>
                      <span className="text-text-secondary text-sm">{improvement}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-bg-secondary border-t border-border-primary safe-area-inset-bottom z-40">
        <div className="flex justify-around py-3 max-w-lg mx-auto">
          <button
            onClick={() => router.push('/')}
            className="flex flex-col items-center text-text-secondary hover:text-text-primary transition-colors"
            aria-label="首页"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-xs mt-1 font-medium">首页</span>
          </button>
          <button
            onClick={() => router.push('/insights')}
            className="flex flex-col items-center text-accent-primary"
            aria-label="AI 分析"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span className="text-xs mt-1 font-medium">AI分析</span>
          </button>
          <button
            onClick={() => router.push('/settings')}
            className="flex flex-col items-center text-text-secondary hover:text-text-primary transition-colors"
            aria-label="设置"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-xs mt-1 font-medium">设置</span>
          </button>
        </div>
      </nav>
    </main>
  )
}
