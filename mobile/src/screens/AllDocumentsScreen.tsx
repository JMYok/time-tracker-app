import { useCallback, useEffect, useMemo, useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native'
import { deleteDocument, DocumentsResponse, fetchAllDocuments, SavedDocument } from '../api/analysis'
import { colors } from '../theme'
import { DocumentsList } from '../components/DocumentsList'

interface AllDocumentsScreenProps {
  onBack: () => void
}

const PAGE_SIZE = 20

const formatDateKey = (value: Date) => value.toISOString().split('T')[0]

const buildSnippet = (content: string) => {
  const plain = content.replace(/\s+/g, ' ').trim()
  if (plain.length <= 80) return plain
  return `${plain.slice(0, 80)}...`
}

export const AllDocumentsScreen = ({ onBack }: AllDocumentsScreenProps) => {
  const [query, setQuery] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [documents, setDocuments] = useState<SavedDocument[]>([])
  const [meta, setMeta] = useState<DocumentsResponse['meta']>()
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [selectedDoc, setSelectedDoc] = useState<SavedDocument | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const totalPages = useMemo(() => {
    if (!meta) return 1
    return Math.max(1, Math.ceil(meta.total / meta.pageSize))
  }, [meta])

  const loadDocuments = useCallback(async (nextPage = 1, mode: 'replace' | 'append' = 'replace') => {
    if (mode === 'append') {
      setIsLoadingMore(true)
    } else {
      setIsLoading(true)
    }
    setError(null)

    try {
      const result = await fetchAllDocuments({
        q: query.trim() || undefined,
        from: from || undefined,
        to: to || undefined,
        page: nextPage,
        pageSize: PAGE_SIZE,
      })
      if (!result.success) {
        throw new Error('加载失败')
      }
      setDocuments((prev) => (mode === 'append' ? [...prev, ...(result.data || [])] : result.data || []))
      setMeta(result.meta)
      setPage(nextPage)
    } catch (err) {
      console.warn('Failed to load documents', err)
      setError('加载失败')
      if (mode !== 'append') {
        setDocuments([])
        setMeta(undefined)
      }
    } finally {
      if (mode === 'append') {
        setIsLoadingMore(false)
      } else {
        setIsLoading(false)
      }
    }
  }, [from, query, to])

  useEffect(() => {
    loadDocuments(1)
  }, [loadDocuments])

  const handleApplyFilter = () => {
    loadDocuments(1, 'replace')
  }

  const handleDelete = async () => {
    if (!selectedDoc || isDeleting) return
    setIsDeleting(true)
    try {
      await deleteDocument(selectedDoc.id)
      setSelectedDoc(null)
      await loadDocuments(page)
    } catch (err) {
      console.warn('Failed to delete document', err)
      setError('删除失败')
    } finally {
      setIsDeleting(false)
    }
  }

  if (selectedDoc) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.detailHeaderRow}>
          <TouchableOpacity onPress={() => setSelectedDoc(null)}>
            <Text style={styles.backText}>返回列表</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>文档详情</Text>
          <TouchableOpacity onPress={handleDelete} disabled={isDeleting}>
            <Text style={styles.deleteText}>{isDeleting ? '删除中...' : '删除'}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.card}>
          <Text style={styles.docMeta}>{selectedDoc.sourceDate || selectedDoc.createdAt}</Text>
          <DocumentsList content={selectedDoc.content} />
        </View>
      </ScrollView>
    )
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.backText}>返回</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>全部文档</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>关键词</Text>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="搜索内容..."
          placeholderTextColor={colors.textTertiary}
          style={styles.input}
        />
        <View style={styles.dateRow}>
          <View style={styles.dateColumn}>
            <Text style={styles.label}>开始日期</Text>
            <TextInput
              value={from}
              onChangeText={setFrom}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textTertiary}
              style={styles.input}
            />
          </View>
          <View style={styles.dateColumn}>
            <Text style={styles.label}>结束日期</Text>
            <TextInput
              value={to}
              onChangeText={setTo}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textTertiary}
              style={styles.input}
            />
          </View>
        </View>
        <TouchableOpacity style={styles.primaryButton} onPress={handleApplyFilter} disabled={isLoading}>
          <Text style={styles.primaryButtonText}>{isLoading ? '加载中...' : '筛选'}</Text>
        </TouchableOpacity>
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>文档列表</Text>
        {documents.length === 0 ? (
          <Text style={styles.mutedText}>暂无文档</Text>
        ) : (
          documents.map((doc) => (
            <TouchableOpacity key={doc.id} style={styles.docItem} onPress={() => setSelectedDoc(doc)}>
              <View style={styles.docItemHeader}>
                <Text style={styles.docMeta}>{doc.sourceDate || doc.createdAt}</Text>
                <Text style={styles.docArrow}>›</Text>
              </View>
              <Text style={styles.docSnippet}>{buildSnippet(doc.content)}</Text>
            </TouchableOpacity>
          ))
        )}
        {meta && meta.total > documents.length && (
          <TouchableOpacity
            style={styles.loadMoreButton}
            onPress={() => loadDocuments(page + 1, 'append')}
            disabled={isLoadingMore}
          >
            {isLoadingMore ? (
              <ActivityIndicator size="small" color={colors.textSecondary} />
            ) : (
              <Text style={styles.loadMoreText}>加载更多</Text>
            )}
          </TouchableOpacity>
        )}
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
    paddingTop: 16,
    paddingBottom: 100,
    gap: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  detailHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backText: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '600',
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  card: {
    backgroundColor: colors.bgSecondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 12,
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
  dateRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dateColumn: {
    flex: 1,
    gap: 6,
  },
  primaryButton: {
    backgroundColor: colors.accent,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
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
    gap: 6,
  },
  docMeta: {
    color: colors.textTertiary,
    fontSize: 11,
  },
  deleteText: {
    color: colors.danger,
    fontSize: 12,
  },
  docItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  docArrow: {
    color: colors.textTertiary,
    fontSize: 16,
  },
  loadMoreButton: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: colors.bgTertiary,
  },
  loadMoreText: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  docSnippet: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
  paginationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  pageButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgTertiary,
  },
  pageButtonDisabled: {
    opacity: 0.5,
  },
  pageButtonText: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  pageMeta: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  errorText: {
    color: colors.danger,
    fontSize: 12,
  },
})
