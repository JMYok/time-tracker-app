import { useEffect, useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native'
import { colors } from '../theme'
import { verifyToken, loadStoredToken, clearStoredToken } from '../api/auth'

interface TokenGateProps {
  children: React.ReactNode
}

export const TokenGate = ({ children }: TokenGateProps) => {
  const [token, setToken] = useState('')
  const [isAuthed, setIsAuthed] = useState(false)
  const [isChecking, setIsChecking] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true
    loadStoredToken()
      .then(async (stored) => {
        if (!stored || !isMounted) return false
        const ok = await verifyToken(stored)
        if (!ok) {
          await clearStoredToken()
        }
        return ok
      })
      .then((ok) => {
        if (isMounted) {
          setIsAuthed(Boolean(ok))
          setIsChecking(false)
        }
      })
      .catch(() => {
        if (isMounted) {
          setIsChecking(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [])

  const handleSubmit = async () => {
    const trimmed = token.trim()
    if (!trimmed) {
      setError('请输入访问令牌')
      return
    }
    setIsChecking(true)
    setError(null)
    try {
      const ok = await verifyToken(trimmed)
      if (!ok) {
        setError('令牌无效')
        setIsChecking(false)
        return
      }
      setIsAuthed(true)
    } catch (err) {
      setError('验证失败')
    } finally {
      setIsChecking(false)
    }
  }

  if (isAuthed) {
    return <>{children}</>
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>输入访问令牌</Text>
        <Text style={styles.subtitle}>首次进入需要验证令牌，验证通过后会自动缓存。</Text>
        <TextInput
          value={token}
          onChangeText={setToken}
          placeholder="请输入 token"
          placeholderTextColor={colors.textTertiary}
          style={styles.input}
          secureTextEntry
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={isChecking}>
          <Text style={styles.buttonText}>{isChecking ? '验证中...' : '进入'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.bgSecondary,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    gap: 12,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '600',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 12,
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
  error: {
    color: colors.danger,
    fontSize: 12,
  },
  button: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
  },
})
