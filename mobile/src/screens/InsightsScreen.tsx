import { useEffect, useMemo, useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native'
import { analyzeDay, AnalysisData, fetchDocuments, saveDocument, deleteDocument, analyzeRange } from '../api/analysis'
import { colors } from '../theme'

interface SavedDocument {
  id: string
  content: string
  sourceDate?: string | null
  createdAt: string
}

export const InsightsScreen = () => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [analysisDraft, setAnalysisDraft] = useState<AnalysisData | null>(null)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const [docs, setDocs] = useState<SavedDocument[]>([])
  const [docsError, setDocsError] = useState<string | null>(null)

  const [rangeSummary, setRangeSummary] = useState<string | null>(null)
  const [rangeError, setRangeError] = useState<string | null>(null)

  useEffect(() => {
    loadDocs()
  }, [date])

  const loadDocs = async () => {
    try {
      const result = await fetchDocuments(date)
      setDocs(result.data || [])
      setDocsError(null)
    } catch (error) {
      setDocs([])
      setDocsError('获取文档失败')
    }
  }

  const handleAnalyze = async () => {
    setIsAnalyzing(true)
    setAnalysisError(null)
    setAnalysisDraft(null)

    try {
      const result = await analyzeDay(date)
      setAnalysisDraft(result.data)
    } catch (error) {
      setAnalysisError('分析失败')
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
    analysis.insights.length ? analysis.insights.forEach((i) => lines.push(`- ${i}`)) : lines.push('- 暂无')
    lines.push('')
    lines.push('## 做得好的点')
    analysis.highlights.length ? analysis.highlights.forEach((i) => lines.push(`- ${i}`)) : lines.push('- 暂无')
    lines.push('')
    lines.push('## 改进建议')
    analysis.improvements.length ? analysis.improvements.forEach((i) => lines.push(`- ${i}`)) : lines.push('- 暂无')
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
    } catch (error) {
      setAnalysisError('保存失败')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteDocument(id)
      await loadDocs()
    } catch (error) {
      setDocsError('删除失败')
    }
  }

  const handleRange = async (range: '30d' | '365d') => {
    setRangeSummary(null)
    setRangeError(null)
    try {
      const result = await analyzeRange(range)
      setRangeSummary(result.data?.content || '')
    } catch (error) {
      setRangeError('回顾失败')
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.label}>选择日期</Text>
        <TextInput
          value={date}
          onChangeText={setDate}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={colors.textTertiary}
          style={styles.input}
        />
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
          <Text style={styles.blockText}>{analysisToMarkdown(analysisDraft)}</Text>
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
              <Text style={styles.blockText}>{doc.content}</Text>
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
        {rangeSummary && <Text style={styles.blockText}>{rangeSummary}</Text>}
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
    padding: 16,
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
  blockText: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
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
