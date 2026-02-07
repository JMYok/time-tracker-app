import { useEffect, useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { colors } from '../theme'
import { TimeEntry } from '../api/entries'

interface TimeSlotCardProps {
  startTime: string
  endTime: string
  isCurrent: boolean
  entry?: TimeEntry
  onSave: (payload: { activity: string; thought: string | null }) => Promise<void>
  onDelete: () => Promise<void>
}

export const TimeSlotCard = ({ startTime, endTime, isCurrent, entry, onSave, onDelete }: TimeSlotCardProps) => {
  const [isEditing, setIsEditing] = useState(false)
  const [activity, setActivity] = useState(entry?.activity || '')
  const [thought, setThought] = useState(entry?.thought || '')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!isEditing) {
      setActivity(entry?.activity || '')
      setThought(entry?.thought || '')
    }
  }, [entry?.id, entry?.activity, entry?.thought, isEditing])

  const hasContent = activity.trim().length > 0 || thought.trim().length > 0

  const handleSave = async () => {
    if (isSaving) return
    setIsSaving(true)
    try {
      if (!activity.trim() && !thought.trim() && entry) {
        await onDelete()
      } else {
        await onSave({ activity: activity.trim(), thought: thought.trim() ? thought.trim() : null })
      }
      setIsEditing(false)
    } finally {
      setIsSaving(false)
    }
  }

  const titleColor = isCurrent ? colors.accent : colors.textSecondary

  return (
    <View style={styles.row}>
      <View style={styles.timeColumn}>
        <Text style={[styles.timeText, { color: titleColor }]}>{startTime}</Text>
      </View>
      <View style={styles.dotColumn}>
        <View style={[styles.dot, isCurrent ? styles.dotCurrent : null, entry ? styles.dotFilled : null]} />
      </View>
      <View style={[styles.card, isCurrent ? styles.cardCurrent : hasContent ? styles.cardFilled : styles.cardEmpty]}>
        {!isEditing ? (
          <TouchableOpacity onPress={() => setIsEditing(true)} style={styles.cardContent}>
            {activity ? (
              <Text style={styles.activityText}>{activity}</Text>
            ) : (
              <Text style={[styles.placeholderText, isCurrent ? styles.placeholderCurrent : null]}>
                {isCurrent ? '记录此刻...' : '点击记录'}
              </Text>
            )}
            {thought ? <Text style={styles.thoughtText}>{thought}</Text> : null}
          </TouchableOpacity>
        ) : (
          <View style={styles.editor}>
            <TextInput
              value={activity}
              onChangeText={setActivity}
              placeholder="你在做什么？"
              placeholderTextColor={colors.textTertiary}
              style={styles.input}
            />
            <TextInput
              value={thought}
              onChangeText={setThought}
              placeholder="想法或备注..."
              placeholderTextColor={colors.textTertiary}
              style={[styles.input, styles.textarea]}
              multiline
            />
            <View style={styles.editorFooter}>
              <TouchableOpacity onPress={handleSave} style={styles.saveButton} disabled={isSaving}>
                <Feather name="send" size={14} color="white" />
                <Text style={styles.saveText}>{isSaving ? '保存中' : '保存'}</Text>
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
    gap: 12,
    marginBottom: 10,
  },
  timeColumn: {
    width: 64,
    alignItems: 'flex-end',
    paddingTop: 8,
  },
  timeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  dotColumn: {
    width: 18,
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
  cardContent: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  activityText: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  thoughtText: {
    color: colors.textSecondary,
    marginTop: 6,
    fontSize: 13,
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
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 6,
  },
  textarea: {
    minHeight: 54,
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
