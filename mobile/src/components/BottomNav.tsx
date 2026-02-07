import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { colors } from '../theme'

type TabKey = 'timeline' | 'insights' | 'settings'

interface BottomNavProps {
  active: TabKey
  onChange: (tab: TabKey) => void
}

export const BottomNav = ({ active, onChange }: BottomNavProps) => {
  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.item} onPress={() => onChange('timeline')}>
        <Feather name="clock" size={20} color={active === 'timeline' ? colors.textPrimary : colors.textSecondary} />
        <Text style={[styles.label, active === 'timeline' ? styles.active : null]}>记录</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.item} onPress={() => onChange('insights')}>
        <Feather name="bar-chart-2" size={20} color={active === 'insights' ? colors.accent : colors.textSecondary} />
        <Text style={[styles.label, active === 'insights' ? styles.active : null]}>AI分析</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.item} onPress={() => onChange('settings')}>
        <Feather name="settings" size={20} color={active === 'settings' ? colors.textPrimary : colors.textSecondary} />
        <Text style={[styles.label, active === 'settings' ? styles.active : null]}>设置</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.bgSecondary,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  item: {
    alignItems: 'center',
    gap: 6,
  },
  label: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  active: {
    color: colors.accent,
    fontWeight: '600',
  },
})
