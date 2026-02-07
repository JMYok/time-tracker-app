import { useEffect, useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native'
import { colors } from '../theme'
import { fetchConfig, saveConfig, AppConfig } from '../api/config'

export const SettingsScreen = () => {
  const [config, setConfig] = useState<AppConfig>({
    zhipuModel: 'glm-4',
    zhipuApiKeyMasked: false,
  })
  const [isSaving, setIsSaving] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')

  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    try {
      const result = await fetchConfig()
      setConfig(result.config || {})
    } catch (error) {
      // ignore
    }
  }

  const handleSave = async () => {
    if (isSaving) return
    setIsSaving(true)
    setStatus('idle')
    try {
      const payload: AppConfig = { ...config }
      if (payload.zhipuApiKeyMasked) {
        delete payload.zhipuApiKey
      }
      delete payload.zhipuApiKeyMasked
      await saveConfig(payload)
      setStatus('success')
    } catch (error) {
      setStatus('error')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.title}>AI 分析配置</Text>
        <Text style={styles.label}>智谱 API 密钥</Text>
        <TextInput
          secureTextEntry
          value={config.zhipuApiKey || ''}
          onChangeText={(value) => setConfig({ ...config, zhipuApiKey: value, zhipuApiKeyMasked: false })}
          placeholder="输入你的智谱 API 密钥"
          placeholderTextColor={colors.textTertiary}
          style={styles.input}
        />

        <Text style={[styles.label, { marginTop: 12 }]}>AI 模型</Text>
        <TextInput
          value={config.zhipuModel || 'glm-4'}
          onChangeText={(value) => setConfig({ ...config, zhipuModel: value })}
          placeholder="glm-4"
          placeholderTextColor={colors.textTertiary}
          style={styles.input}
        />
      </View>

      <TouchableOpacity style={styles.primaryButton} onPress={handleSave} disabled={isSaving}>
        <Text style={styles.primaryButtonText}>{isSaving ? '保存中...' : '保存设置'}</Text>
      </TouchableOpacity>

      {status === 'success' && <Text style={styles.successText}>已保存</Text>}
      {status === 'error' && <Text style={styles.errorText}>保存失败</Text>}
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
    gap: 12,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: colors.bgSecondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: 6,
  },
  input: {
    backgroundColor: colors.bgTertiary,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.textPrimary,
  },
  primaryButton: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  successText: {
    color: colors.success,
    fontSize: 12,
  },
  errorText: {
    color: colors.danger,
    fontSize: 12,
  },
})
