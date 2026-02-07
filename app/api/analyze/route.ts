import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ZhipuProvider } from '@/lib/ai/providers/zhipu'

// POST /api/analyze - Analyze daily time entries with AI
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { date } = body

    if (!date) {
      return NextResponse.json(
        { success: false, error: 'Date is required (format: YYYY-MM-DD)' },
        { status: 400 }
      )
    }

    // Get all entries for the date
    const entries = await prisma.timeEntry.findMany({
      where: { date },
      orderBy: { startTime: 'asc' },
    })

    if (!entries.length) {
      return NextResponse.json(
        { success: false, error: 'No entries found for this date' },
        { status: 404 }
      )
    }

    // Get AI configuration
    const configRecord = await prisma.appConfig.findUnique({
      where: { key: 'app_config' },
    })

    if (!configRecord) {
      return NextResponse.json(
        { success: false, error: 'AI configuration not found. Please configure API key in settings.' },
        { status: 400 }
      )
    }

    const config = JSON.parse(configRecord.value)

    if (!config.zhipuApiKey) {
      return NextResponse.json(
        { success: false, error: 'Zhipu API key not configured. Please configure in settings.' },
        { status: 400 }
      )
    }

    // Run AI analysis
    const provider = new ZhipuProvider({
      apiKey: config.zhipuApiKey,
      model: config.zhipuModel || 'glm-4',
    })

    const analysisResult = await provider.analyze(entries)

    return NextResponse.json({
      success: true,
      data: analysisResult,
    })
  } catch (error) {
    console.error('Error analyzing entries:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to analyze entries' },
      { status: 500 }
    )
  }
}
