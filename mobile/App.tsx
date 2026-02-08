import { useState } from 'react'
import { StatusBar } from 'expo-status-bar'
import { View, StyleSheet } from 'react-native'
import { BottomNav } from './src/components/BottomNav'
import { TokenGate } from './src/components/TokenGate'
import { TimelineScreen } from './src/screens/TimelineScreen'
import { InsightsScreen } from './src/screens/InsightsScreen'
import { SettingsScreen } from './src/screens/SettingsScreen'
import { colors } from './src/theme'

type TabKey = 'timeline' | 'insights' | 'settings'

export default function App() {
  const [tab, setTab] = useState<TabKey>('timeline')

  return (
    <View style={styles.container}>
      <StatusBar style="light" translucent backgroundColor="transparent" />
      <TokenGate>
        <View style={styles.content}>
          {tab === 'timeline' && <TimelineScreen />}
          {tab === 'insights' && <InsightsScreen />}
          {tab === 'settings' && <SettingsScreen />}
        </View>
        <BottomNav active={tab} onChange={setTab} />
      </TokenGate>
    </View>
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
