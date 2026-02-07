'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface AppConfig {
  zhipuApiKey?: string
  zhipuApiKeyMasked?: boolean
  zhipuModel?: string
}

export default function SettingsPage() {
  const router = useRouter()
  const [config, setConfig] = useState<AppConfig>({
    zhipuModel: 'glm-4',
    zhipuApiKeyMasked: false,
  })
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle')

  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    try {
      const response = await fetch('/api/config')
      if (response.ok) {
        const data = await response.json()
        setConfig(data.config || {})
      }
    } catch (error) {
      console.error('Failed to load config:', error)
    }
  }

  const saveConfig = async () => {
    if (isSaving) return
    setIsSaving(true)
    setSaveStatus('idle')

    try {
      const payload: AppConfig = { ...config }
      if (payload.zhipuApiKeyMasked) {
        delete payload.zhipuApiKey
      }
      delete payload.zhipuApiKeyMasked

      const response = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        setSaveStatus('success')
        setTimeout(() => setSaveStatus('idle'), 2000)
      } else {
        setSaveStatus('error')
      }
    } catch (error) {
      console.error('Failed to save config:', error)
      setSaveStatus('error')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <main className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-bg-secondary border-b border-border-primary">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 -ml-2 text-text-secondary hover:text-text-primary"
              aria-label="返回"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-lg font-semibold text-text-primary">设置</h1>
          </div>
        </div>
      </div>

      {/* Settings Form */}
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* AI Configuration */}
        <section className="bg-bg-secondary rounded-xl border border-border-primary p-4">
          <h2 className="text-base font-medium text-text-primary mb-4">AI 分析配置</h2>

          <div className="space-y-4">
            <div>
              <label htmlFor="zhipuApiKey" className="block text-sm text-text-secondary mb-2">
                智谱 API 密钥
              </label>
              <input
                id="zhipuApiKey"
                type="password"
                value={config.zhipuApiKey || ''}
                onChange={(e) => setConfig({ ...config, zhipuApiKey: e.target.value, zhipuApiKeyMasked: false })}
                placeholder="输入你的智谱 API 密钥"
                className="w-full bg-bg-tertiary text-text-primary px-4 py-2.5 rounded-lg border border-border-primary focus:outline-none focus:border-accent-primary"
              />
              <p className="text-xs text-text-tertiary mt-1.5">
                用于每日时间分析和 AI 洞察生成
              </p>
            </div>

            <div>
              <label htmlFor="zhipuModel" className="block text-sm text-text-secondary mb-2">
                AI 模型
              </label>
              <select
                id="zhipuModel"
                value={config.zhipuModel || 'glm-4'}
                onChange={(e) => setConfig({ ...config, zhipuModel: e.target.value })}
                className="w-full bg-bg-tertiary text-text-primary px-4 py-2.5 rounded-lg border border-border-primary focus:outline-none focus:border-accent-primary"
              >
                <option value="glm-4">GLM-4 (推荐)</option>
                <option value="glm-4-flash">GLM-4 Flash (快速)</option>
                <option value="glm-4-plus">GLM-4 Plus (高级)</option>
              </select>
            </div>
          </div>
        </section>

        {/* Save Button */}
        <div className="flex items-center gap-3">
          <button
            onClick={saveConfig}
            disabled={isSaving}
            className="flex-1 bg-accent-primary text-white px-6 py-3 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
          >
            {isSaving ? '保存中...' : '保存设置'}
          </button>

          {saveStatus === 'success' && (
            <div className="flex items-center gap-2 text-green-500 text-sm">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              已保存
            </div>
          )}

          {saveStatus === 'error' && (
            <div className="flex items-center gap-2 text-red-500 text-sm">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              保存失败
            </div>
          )}
        </div>
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-bg-secondary border-t border-border-primary safe-area-inset-bottom z-40">
        <div className="flex justify-around py-3 max-w-lg mx-auto">
          <button
            onClick={() => router.push('/')}
            className="flex flex-col items-center text-text-secondary hover:text-text-primary transition-colors"
            aria-label="首页"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-xs mt-1 font-medium">首页</span>
          </button>
          <button
            className="flex flex-col items-center text-accent-primary"
            aria-label="设置"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-xs mt-1 font-medium">设置</span>
          </button>
        </div>
      </nav>
    </main>
  )
}
