import { useCallback, useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Platform } from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import Constants from 'expo-constants'
import { analyzeDay, AnalysisData, fetchDocuments, saveDocument, deleteDocument, analyzeRange } from '../api/analysis'
import { colors } from '../theme'
import { readSelectedDate, writeSelectedDate } from '../storage/selectedDate'
import { readAnalysisCache, writeAnalysisCache } from '../storage/analysisCache'

interface SavedDocument {
  id: string
  content: string
  sourceDate?: string | null
  createdAt: string
}

const safeTop = Constants.statusBarHeight || 0

export const InsightsScreen = () => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [showPicker, setShowPicker] = useState(false)
  const [analysisDraft, setAnalysisDraft] = useState<AnalysisData | null>(null)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const [docs, setDocs] = useState<SavedDocument[]>([])
  const [docsError, setDocsError] = useState<string | null>(null)

  const [rangeSummary, setRangeSummary] = useState<string | null>(null)
  const [rangeError, setRangeError] = useState<string | null>(null)

  const loadDocs = useCallback(async () => {
    try {
      const result = await fetchDocuments(date)
      setDocs(result.data || [])
      setDocsError(null)
    } catch {
      setDocs([])
      setDocsError('获取文档失败')
    }
  }, [date])

  useEffect(() => {
    let mounted = true
    const load = async () => {
      const stored = await readSelectedDate()
      if (mounted && stored) {
        setDate(stored)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [])

  const formatDateKey = (value: Date) => value.toISOString().split('T')[0]

  const handleDateChange = (_event: unknown, value?: Date) => {
    if (!value) {
      setShowPicker(false)
      return
    }
    const next = formatDateKey(value)
    setDate(next)
    void writeSelectedDate(next)
    if (Platform.OS !== 'ios') {
      setShowPicker(false)
    }
  }

  useEffect(() => {
    loadDocs()
  }, [loadDocs])

  const handleAnalyze = async () => {
    setIsAnalyzing(true)
    setAnalysisError(null)
    setAnalysisDraft(null)

    try {
      const cached = await readAnalysisCache<AnalysisData>(date)
      if (cached) {
        setAnalysisDraft(cached)
        setIsAnalyzing(false)
        return
      }
      const result = await analyzeDay(date)
      setAnalysisDraft(result.data)
      await writeAnalysisCache(date, result.data)
    } catch (err) {
      const message = err instanceof Error ? err.message : ''
      if (message.includes('No entries found for this date')) {
        setAnalysisError('今天还没有记录，先记几条再分析。')
      } else {
        setAnalysisError('分析失败')
      }
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
    if (analysis.dailyNarrative) {
      lines.push('')
      lines.push('## 日记式总结')
      lines.push(analysis.dailyNarrative)
    }
    if (analysis.energyMoodCurve && Object.keys(analysis.energyMoodCurve).length > 0) {
      lines.push('')
      lines.push('## 情绪与能量曲线')
      Object.entries(analysis.energyMoodCurve).forEach(([key, value]) => {
        lines.push(`- ${key}: ${value}`)
      })
    }
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
    if (analysis.reflectionQuestions && analysis.reflectionQuestions.length) {
      lines.push('')
      lines.push('## 反思问题')
      analysis.reflectionQuestions.forEach((item) => lines.push(`- ${item}`))
    }
    if (analysis.reflectionInspiration && analysis.reflectionInspiration.length) {
      lines.push('')
      lines.push('## 反思灵感')
      analysis.reflectionInspiration.forEach((item) => lines.push(`- ${item}`))
    }
    lines.push('')
    lines.push('## 时间分布（小时）')
    Object.entries(analysis.timeDistribution || {}).forEach(([key, value]) => {
      lines.push(`- ${key}: ${typeof value === 'number' ? value.toFixed(1) : value}`)
    })
    return lines.join('\n')
  }

  const handleSave = async () => {
    if (!analysisDraft || isSaving) return
    setIsSaving(true)
    try {
      const content = analysisToMarkdown(analysisDraft)
      await saveDocument({ date, content })
      await loadDocs()
    } catch {
      setAnalysisError('保存失败')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteDocument(id)
      await loadDocs()
    } catch {
      setDocsError('删除失败')
    }
  }

  const handleRange = async (range: '30d' | '365d') => {
    setRangeSummary(null)
    setRangeError(null)
    try {
      const result = await analyzeRange(range)
      setRangeSummary(result.data?.content || '')
    } catch {
      setRangeError('回顾失败')
    }
  }

  const parseMarkdownSections = (content: string) => {
    const sections: { title: string; body: string[] }[] = []
    const lines = content.split(/\r?\n/)
    let currentTitle = '内容'
    let buffer: string[] = []

    const flush = () => {
      const text = buffer.join('\n').trim()
      if (!text) return
      sections.push({ title: currentTitle || '内容', body: buffer })
      buffer = []
    }

    lines.forEach((line) => {
      if (line.startsWith('## ')) {
        flush()
        currentTitle = line.replace(/^##\s+/, '').trim() || '内容'
        return
      }
      if (line.startsWith('# ')) {
        return
      }
      buffer.push(line)
    })
    flush()
    return sections
  }

  const renderBulletList = (items: string[], emptyText = '暂无') => {
    if (!items || items.length === 0) {
      return <Text style={styles.blockText}>{emptyText}</Text>
    }
    return items.map((item, index) => (
      <View key={`${item}-${index}`} style={styles.listRow}>
        <Text style={styles.listDot}>•</Text>
        <Text style={styles.listText}>{item}</Text>
      </View>
    ))
  }

  const renderMarkdownBlocks = (content: string) => {
    const sections = parseMarkdownSections(content)
    if (sections.length === 0) {
      return <Text style={styles.blockText}>{content}</Text>
    }

    return sections.map((section, index) => (
      <View key={`${section.title}-${index}`} style={styles.blockCard}>
        <Text style={styles.blockTitle}>{section.title}</Text>
        <Text style={styles.blockText}>{section.body.join('\n').trim()}</Text>
      </View>
    ))
  }

  useEffect(() => {
    let mounted = true
    const loadCache = async () => {
      const cached = await readAnalysisCache<AnalysisData>(date)
      if (mounted && cached) {
        setAnalysisDraft(cached)
      }
    }
    loadCache()
    return () => {
      mounted = false
    }
  }, [date])

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.label}>选择日期</Text>
        <TouchableOpacity style={styles.datePickerTrigger} onPress={() => setShowPicker(true)}>
          <Text style={styles.datePickerText}>{date}</Text>
        </TouchableOpacity>
        {showPicker && (
          <DateTimePicker
            value={new Date(`${date}T00:00:00`)}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'spinner'}
            textColor={colors.textPrimary}
            onChange={handleDateChange}
          />
        )}
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.primaryButton} onPress={handleAnalyze} disabled={isAnalyzing}>
            <Text style={styles.primaryButtonText}>{isAnalyzing ? '分析中...' : '分析这一天'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={handleSave} disabled={!analysisDraft || isSaving}>
            <Text style={styles.secondaryButtonText}>{isSaving ? '保存中...' : '保存文档'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {analysisError && <Text style={styles.errorText}>{analysisError}</Text>}

      {analysisDraft && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>分析草稿</Text>
          <View style={styles.blockCard}>
            <Text style={styles.blockTitle}>总结</Text>
            <Text style={styles.blockText}>{analysisDraft.summary || '暂无'}</Text>
          </View>
          {analysisDraft.dailyNarrative ? (
            <View style={styles.blockCard}>
              <Text style={styles.blockTitle}>日记式总结</Text>
              <Text style={styles.blockText}>{analysisDraft.dailyNarrative}</Text>
            </View>
          ) : null}
          {analysisDraft.energyMoodCurve && Object.keys(analysisDraft.energyMoodCurve).length > 0 ? (
            <View style={styles.blockCard}>
              <Text style={styles.blockTitle}>情绪与能量曲线</Text>
              {Object.entries(analysisDraft.energyMoodCurve).map(([key, value]) => (
                <View key={key} style={styles.listRow}>
                  <Text style={styles.listDot}>•</Text>
                  <Text style={styles.listText}>{key}: {value}</Text>
                </View>
              ))}
            </View>
          ) : null}
          <View style={styles.blockCard}>
            <Text style={styles.blockTitle}>洞察</Text>
            {renderBulletList(analysisDraft.insights)}
          </View>
          <View style={styles.blockCard}>
            <Text style={styles.blockTitle}>做得好的点</Text>
            {renderBulletList(analysisDraft.highlights)}
          </View>
          <View style={styles.blockCard}>
            <Text style={styles.blockTitle}>改进建议</Text>
            {renderBulletList(analysisDraft.improvements)}
          </View>
          {analysisDraft.reflectionQuestions && analysisDraft.reflectionQuestions.length > 0 ? (
            <View style={styles.blockCard}>
              <Text style={styles.blockTitle}>反思问题</Text>
              {renderBulletList(analysisDraft.reflectionQuestions)}
            </View>
          ) : null}
          {analysisDraft.reflectionInspiration && analysisDraft.reflectionInspiration.length > 0 ? (
            <View style={styles.blockCard}>
              <Text style={styles.blockTitle}>反思灵感</Text>
              {renderBulletList(analysisDraft.reflectionInspiration)}
            </View>
          ) : null}
          <View style={styles.blockCard}>
            <Text style={styles.blockTitle}>时间分布</Text>
            {Object.keys(analysisDraft.timeDistribution || {}).length === 0 ? (
              <Text style={styles.blockText}>暂无</Text>
            ) : (
              Object.entries(analysisDraft.timeDistribution || {}).map(([key, value]) => (
                <View key={key} style={styles.listRow}>
                  <Text style={styles.listDot}>•</Text>
                  <Text style={styles.listText}>
                    {key}: {typeof value === 'number' ? value.toFixed(1) : value}
                  </Text>
                </View>
              ))
            )}
          </View>
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>已保存文档</Text>
        {docsError && <Text style={styles.errorText}>{docsError}</Text>}
        {docs.length === 0 ? (
          <Text style={styles.mutedText}>暂无已保存文档</Text>
        ) : (
          docs.map((doc) => (
            <View key={doc.id} style={styles.docItem}>
              <View style={styles.docHeader}>
                <Text style={styles.docMeta}>{doc.createdAt}</Text>
                <TouchableOpacity onPress={() => handleDelete(doc.id)}>
                  <Text style={styles.deleteText}>删除</Text>
                </TouchableOpacity>
              </View>
              {renderMarkdownBlocks(doc.content)}
            </View>
          ))
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>文档回顾</Text>
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => handleRange('30d')}>
            <Text style={styles.secondaryButtonText}>最近30天</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => handleRange('365d')}>
            <Text style={styles.secondaryButtonText}>最近一年</Text>
          </TouchableOpacity>
        </View>
        {rangeError && <Text style={styles.errorText}>{rangeError}</Text>}
        {rangeSummary && renderMarkdownBlocks(rangeSummary)}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: safeTop + 16,
    paddingBottom: 100,
    gap: 16,
  },
  card: {
    backgroundColor: colors.bgSecondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 10,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.textPrimary,
    fontSize: 14,
    backgroundColor: colors.bgTertiary,
  },
  datePickerTrigger: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: colors.bgTertiary,
  },
  datePickerText: {
    color: colors.textPrimary,
    fontSize: 14,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: colors.accent,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  secondaryButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: colors.bgTertiary,
  },
  secondaryButtonText: {
    color: colors.textPrimary,
    fontWeight: '600',
    fontSize: 12,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  blockCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    backgroundColor: colors.bgTertiary,
    gap: 8,
  },
  blockTitle: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  blockText: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  listDot: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
  listText: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    flex: 1,
  },
  mutedText: {
    color: colors.textTertiary,
    fontSize: 12,
  },
  docItem: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    backgroundColor: colors.bgTertiary,
    gap: 8,
  },
  docHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  docMeta: {
    color: colors.textTertiary,
    fontSize: 11,
  },
  deleteText: {
    color: colors.danger,
    fontSize: 12,
  },
  errorText: {
    color: colors.danger,
    fontSize: 12,
  },
})
