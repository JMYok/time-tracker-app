import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

const CONFIG_KEY = 'app_config'

export const getAccessToken = async () => {
  const configRecord = await prisma.appConfig.findUnique({
    where: { key: CONFIG_KEY },
  })

  if (!configRecord) return null

  try {
    const config = JSON.parse(configRecord.value || '{}')
    return typeof config.accessToken === 'string' ? config.accessToken : null
  } catch (error) {
    return null
  }
}

export const extractToken = (request: NextRequest) => {
  const authHeader = request.headers.get('authorization') || ''
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice('Bearer '.length).trim()
  }
  const tokenHeader = request.headers.get('x-app-token') || ''
  return tokenHeader.trim() || null
}

export const isAuthorized = async (request: NextRequest) => {
  const stored = await getAccessToken()
  if (!stored) return true
  const token = extractToken(request)
  return Boolean(token && token === stored)
}
