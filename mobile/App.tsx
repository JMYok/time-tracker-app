import { useState } from 'react'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaView, View, StyleSheet } from 'react-native'
import { BottomNav } from './src/components/BottomNav'
import { TimelineScreen } from './src/screens/TimelineScreen'
import { InsightsScreen } from './src/screens/InsightsScreen'
import { SettingsScreen } from './src/screens/SettingsScreen'
import { colors } from './src/theme'

type TabKey = 'timeline' | 'insights' | 'settings'

export default function App() {
  const [tab, setTab] = useState<TabKey>('timeline')

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.content}>
        {tab === 'timeline' && <TimelineScreen />}
        {tab === 'insights' && <InsightsScreen />}
        {tab === 'settings' && <SettingsScreen />}
      </View>
      <BottomNav active={tab} onChange={setTab} />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  content: {
    flex: 1,
  },
})
