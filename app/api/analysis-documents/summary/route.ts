import { NextRequest, NextResponse } from 'next/server'
import { isAuthorized } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ZhipuProvider } from '@/lib/ai/providers/zhipu'

const TYPE = 'analysis'

const parseRange = (range?: string) => {
  const now = new Date()
  const end = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))
  const start = new Date(end)

  if (range === '365d') {
    start.setUTCDate(start.getUTCDate() - 364)
  } else {
    start.setUTCDate(start.getUTCDate() - 29)
  }

  return { start, end }
}

export async function POST(request: NextRequest) {
  try {
    if (!(await isAuthorized(request))) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    const body = await request.json()
    const range = body?.range === '365d' ? '365d' : '30d'
    const { start, end } = parseRange(range)

    const startDate = start.toISOString().slice(0, 10)
    const endDate = end.toISOString().slice(0, 10)

    const docs = await prisma.savedNote.findMany({
      where: {
        type: TYPE,
        sourceDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { sourceDate: 'asc' },
      select: {
        content: true,
        sourceDate: true,
      },
    })

    if (!docs.length) {
      return NextResponse.json(
        { success: false, error: 'No saved documents in range' },
        { status: 404 }
      )
    }

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

    const provider = new ZhipuProvider({
      apiKey: config.zhipuApiKey,
      model: config.zhipuModel || 'glm-4',
    })

    const rangeLabel = range === '365d' ? '最近一年' : '最近一个月'
    const content = await provider.analyzeDocuments(
      docs.map((doc) => ({ date: doc.sourceDate || '', content: doc.content })),
      rangeLabel
    )

    return NextResponse.json({ success: true, data: { content } })
  } catch (error) {
    console.error('Error analyzing documents:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to analyze documents' },
      { status: 500 }
    )
  }
}
