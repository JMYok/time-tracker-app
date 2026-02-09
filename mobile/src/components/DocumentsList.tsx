import { View, Text, StyleSheet } from 'react-native'
import { colors } from '../theme'

interface DocumentsListProps {
  content: string
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

export const DocumentsList = ({ content }: DocumentsListProps) => {
  const sections = parseMarkdownSections(content)
  if (sections.length === 0) {
    return <Text style={styles.blockText}>{content}</Text>
  }

  return (
    <View style={styles.stack}>
      {sections.map((section, index) => (
        <View key={`${section.title}-${index}`} style={styles.blockCard}>
          <Text style={styles.blockTitle}>{section.title}</Text>
          <Text style={styles.blockText}>{section.body.join('\n').trim()}</Text>
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  stack: {
    gap: 10,
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
})
