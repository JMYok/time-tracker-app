import { apiFetch } from './client'

export interface AppConfig {
  zhipuApiKey?: string
  zhipuApiKeyMasked?: boolean
  zhipuModel?: string
}

export const fetchConfig = async () => {
  return apiFetch<{ success: boolean; config: AppConfig }>(`/api/config`)
}

export const saveConfig = async (payload: AppConfig) => {
  return apiFetch<{ success: boolean }>(`/api/config`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}
