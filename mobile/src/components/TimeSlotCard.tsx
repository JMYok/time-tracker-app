import { useEffect, useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { colors } from '../theme'
import { TimeEntry } from '../api/entries'
import { timelineLayout } from './timelineLayout'

interface TimeSlotCardProps {
  startTime: string
  endTime: string
  isCurrent: boolean
  entry?: TimeEntry
  isSelected?: boolean
  onSave: (payload: { activity: string; thought: string | null; isSameAsPrevious?: boolean }) => Promise<void>
  onDelete: () => Promise<void>
  onCopyPrevious?: () => void
  onLayout?: (startTime: string, layout: { y: number; height: number }) => void
}

export const TimeSlotCard = ({
  startTime,
  endTime,
  isCurrent,
  entry,
  isSelected,
  onSave,
  onDelete,
  onCopyPrevious,
  onLayout,
}: TimeSlotCardProps) => {
  const [isEditing, setIsEditing] = useState(false)
  const [activity, setActivity] = useState(entry?.activity || '')
  const [isSaving, setIsSaving] = useState(false)
  const [hasManualEdit, setHasManualEdit] = useState(false)

  useEffect(() => {
    if (!isEditing) {
      setActivity(entry?.activity || '')
    }
    setHasManualEdit(false)
  }, [entry?.id, entry?.activity, entry?.isSameAsPrevious, isEditing])

  const hasContent = activity.trim().length > 0

  const handleSave = async () => {
    if (isSaving) return
    setIsSaving(true)
    try {
      if (!activity.trim() && entry) {
        await onDelete()
      } else {
        await onSave({
          activity: activity.trim(),
          thought: null,
          isSameAsPrevious: hasManualEdit ? false : entry?.isSameAsPrevious,
        })
      }
      setIsEditing(false)
    } finally {
      setIsSaving(false)
    }
  }

  const handleChangeActivity = (value: string) => {
    setActivity(value)
    if (entry?.isSameAsPrevious) {
      setHasManualEdit(true)
    }
  }

  const titleColor = isCurrent ? colors.accent : colors.textSecondary

  return (
    <View
      style={styles.row}
      onLayout={(event) => {
        const layout = event.nativeEvent.layout
        onLayout?.(startTime, { y: layout.y, height: layout.height })
      }}
    >
      <View style={styles.timeColumn}>
        <Text style={[styles.timeText, { color: titleColor }]}>{startTime}</Text>
      </View>
      <View style={styles.dotColumn}>
        <View
          style={[
            styles.dot,
            isCurrent ? styles.dotCurrent : null,
            entry ? styles.dotFilled : null,
            entry?.isSameAsPrevious ? styles.dotCopied : null,
          ]}
        />
      </View>
      <View
        style={[
          styles.card,
          hasContent ? styles.cardFilled : styles.cardEmpty,
          isCurrent ? styles.cardCurrent : null,
          entry?.isSameAsPrevious ? styles.cardCopied : null,
          isSelected ? styles.cardSelected : null,
        ]}
      >
        {!isEditing ? (
          <TouchableOpacity
            onPress={() => setIsEditing(true)}
            onLongPress={onCopyPrevious}
            style={styles.cardContent}
            activeOpacity={0.7}
          >
            {activity ? (
              <Text style={styles.activityText}>{activity}</Text>
            ) : (
              <Text style={[styles.placeholderText, isCurrent ? styles.placeholderCurrent : null]}>
                {isCurrent ? '记录此刻...' : '点击记录'}
              </Text>
            )}
          </TouchableOpacity>
        ) : (
          <View style={styles.editor}>
            <TextInput
              value={activity}
              onChangeText={handleChangeActivity}
              multiline
              numberOfLines={4}
              scrollEnabled
              showsVerticalScrollIndicator
              textAlignVertical="top"
              placeholder="你在做什么？"
              placeholderTextColor={colors.textTertiary}
              style={styles.input}
            />
            <View style={styles.editorFooter}>
              <TouchableOpacity onPress={handleSave} style={styles.saveButton} disabled={isSaving}>
                <Feather name="send" size={14} color="white" />
                <Text style={styles.saveText}>{isSaving ? '保存中...' : '保存'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: timelineLayout.columnGap,
    marginBottom: 10,
  },
  timeColumn: {
    width: timelineLayout.timeColumnWidth,
    alignItems: 'flex-end',
    paddingTop: 8,
  },
  timeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  dotColumn: {
    width: timelineLayout.dotColumnWidth,
    alignItems: 'center',
    paddingTop: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.bgPrimary,
    borderWidth: 2,
    borderColor: colors.border,
  },
  dotCurrent: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderColor: colors.accent,
    backgroundColor: colors.accent,
  },
  dotFilled: {
    borderColor: colors.accent,
  },
  dotCopied: {
    borderColor: colors.borderCopied,
  },
  card: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
  },
  cardEmpty: {
    backgroundColor: colors.bgPrimary,
    borderColor: colors.border,
  },
  cardFilled: {
    backgroundColor: colors.bgSecondary,
    borderColor: colors.border,
  },
  cardCurrent: {
    backgroundColor: colors.bgTertiary,
    borderColor: colors.accent,
  },
  cardCopied: {
    borderColor: colors.borderCopied,
  },
  cardSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.bgTertiary,
  },
  cardContent: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  activityText: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  placeholderText: {
    color: colors.textTertiary,
    fontSize: 15,
  },
  placeholderCurrent: {
    color: colors.textSecondary,
  },
  editor: {
    padding: 12,
    gap: 10,
  },
  input: {
    color: colors.textPrimary,
    fontSize: 15,
    lineHeight: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: 6,
    minHeight: 92,
    maxHeight: 92,
    textAlignVertical: 'top',
  },
  editorFooter: {
    alignItems: 'flex-end',
    marginTop: 4,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.accent,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  saveText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
})
