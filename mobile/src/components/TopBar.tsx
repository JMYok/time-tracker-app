import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import Constants from 'expo-constants'
import { Feather } from '@expo/vector-icons'
import { colors } from '../theme'
import { formatDate, getWeekday } from '../utils/date'

interface TopBarProps {
  date: Date
  onPrev: () => void
  onNext: () => void
  onToday?: () => void
  showToday?: boolean
}

export const TopBar = ({ date, onPrev, onNext, onToday, showToday }: TopBarProps) => {
  return (
    <View style={styles.wrapper}>
      <TouchableOpacity onPress={onPrev} style={styles.navButton}>
        <Feather name="chevron-left" size={18} color={colors.textSecondary} />
      </TouchableOpacity>

      <View style={styles.center}>
        <Text style={styles.dateMain}>{formatDate(date)}</Text>
        <Text style={[styles.dateSub, showToday ? styles.today : null]}>{getWeekday(date)}</Text>
      </View>

      <View style={styles.right}>
        {onToday && showToday === false && (
          <TouchableOpacity onPress={onToday} style={styles.todayButton}>
            <Text style={styles.todayText}>现在</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={onNext} style={styles.navButton}>
          <Feather name="chevron-right" size={18} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: colors.bgSecondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: 16,
    paddingTop: (Constants.statusBarHeight || 0) + 12,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    alignItems: 'center',
  },
  dateMain: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  dateSub: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  today: {
    color: colors.accent,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  todayButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgTertiary,
  },
  todayText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
})
