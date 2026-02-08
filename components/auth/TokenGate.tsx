'use client'

import { useEffect, useState } from 'react'
import { authFetch, clearStoredToken, getStoredToken, setStoredToken } from '@/lib/auth-client'

interface TokenGateProps {
  children: React.ReactNode
}

export function TokenGate({ children }: TokenGateProps) {
  const [token, setToken] = useState('')
  const [isAuthed, setIsAuthed] = useState(false)
  const [isChecking, setIsChecking] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const stored = getStoredToken()
    if (stored) {
      setToken(stored)
      verifyToken(stored)
        .then((ok) => {
          setIsAuthed(ok)
          if (!ok) clearStoredToken()
        })
        .finally(() => setIsChecking(false))
    } else {
      setIsChecking(false)
    }

    const handleInvalid = () => {
      clearStoredToken()
      setIsAuthed(false)
      setError('令牌已失效，请重新输入。')
    }

    window.addEventListener('auth:invalid', handleInvalid)
    return () => window.removeEventListener('auth:invalid', handleInvalid)
  }, [])

  const verifyToken = async (value: string) => {
    const response = await authFetch('/api/auth/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${value}` },
      body: JSON.stringify({ token: value }),
    })
    return response.ok
  }

  const handleSubmit = async () => {
    setError(null)
    const trimmed = token.trim()
    if (!trimmed) {
      setError('请输入访问令牌')
      return
    }
    setIsChecking(true)
    const ok = await verifyToken(trimmed)
    setIsChecking(false)
    if (!ok) {
      setError('令牌无效')
      return
    }
    setStoredToken(trimmed)
    setIsAuthed(true)
  }

  if (isAuthed) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-6">
      <div className="w-full max-w-sm bg-[#141414] border border-[#262626] rounded-2xl p-6 shadow-2xl">
        <h1 className="text-[#E5E5E5] text-lg font-semibold">输入访问令牌</h1>
        <p className="text-[#737373] text-sm mt-2">首次进入需要验证令牌，验证通过后将自动缓存。</p>
        <input
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="请输入 token"
          className="mt-5 w-full bg-[#0A0A0A] text-[#E5E5E5] border border-[#262626] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#3B82F6]"
        />
        {error && <div className="text-[#EF4444] text-xs mt-3">{error}</div>}
        <button
          onClick={handleSubmit}
          disabled={isChecking}
          className="mt-5 w-full bg-[#3B82F6] text-white rounded-xl py-3 text-sm font-semibold disabled:opacity-60"
        >
          {isChecking ? '验证中...' : '进入'}
        </button>
      </div>
    </div>
  )
}
