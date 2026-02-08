import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isAuthorized } from '@/lib/auth'

const CONFIG_KEY = 'app_config'

// GET /api/config - Get app configuration
export async function GET(request: NextRequest) {
  try {
    if (!(await isAuthorized(request))) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    const configRecord = await prisma.appConfig.findUnique({
      where: { key: CONFIG_KEY },
    })

    if (!configRecord) {
      return NextResponse.json({
        success: true,
        config: {
          zhipuModel: 'glm-4',
          zhipuApiKey: '',
          zhipuApiKeyMasked: false,
        },
      })
    }

    const config = JSON.parse(configRecord.value)
    // Remove sensitive data from response
    const { zhipuApiKey, accessToken, ...safeConfig } = config
    const maskedKey = zhipuApiKey ? '*'.repeat(String(zhipuApiKey).length) : ''

    return NextResponse.json({
      success: true,
      config: {
        ...safeConfig,
        zhipuApiKey: maskedKey,
        zhipuApiKeyMasked: Boolean(zhipuApiKey),
      },
    })
  } catch (error) {
    console.error('Error fetching config:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch configuration' },
      { status: 500 }
    )
  }
}

// POST /api/config - Save app configuration
export async function POST(request: NextRequest) {
  try {
    if (!(await isAuthorized(request))) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    const body = await request.json()
    const { zhipuApiKey, zhipuModel } = body

    // Get existing config
    const existingConfig = await prisma.appConfig.findUnique({
      where: { key: CONFIG_KEY },
    })

    let currentConfig = {}
    if (existingConfig) {
      currentConfig = JSON.parse(existingConfig.value)
    }

    // Update config (preserve API key if not provided)
    const newConfig = {
      ...currentConfig,
      ...(zhipuApiKey !== undefined && { zhipuApiKey }),
      ...(zhipuModel && { zhipuModel }),
    }

    // Save to database
    await prisma.appConfig.upsert({
      where: { key: CONFIG_KEY },
      update: { value: JSON.stringify(newConfig) },
      create: { key: CONFIG_KEY, value: JSON.stringify(newConfig) },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error saving config:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to save configuration' },
      { status: 500 }
    )
  }
}
