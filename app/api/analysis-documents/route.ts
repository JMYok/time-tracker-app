import { NextRequest, NextResponse } from 'next/server'
import { isAuthorized } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const TYPE = 'analysis'

const isValidDate = (date: string) => /^\d{4}-\d{2}-\d{2}$/.test(date)

export async function GET(request: NextRequest) {
  try {
    if (!(await isAuthorized(request))) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const q = searchParams.get('q')
    const page = Math.max(1, Number(searchParams.get('page') || '1'))
    const pageSize = Math.min(50, Math.max(1, Number(searchParams.get('pageSize') || '20')))

    if (date && !isValidDate(date)) {
      return NextResponse.json(
        { success: false, error: 'Invalid date format. Use YYYY-MM-DD' },
        { status: 400 }
      )
    }
    if (from && !isValidDate(from)) {
      return NextResponse.json(
        { success: false, error: 'Invalid from date format. Use YYYY-MM-DD' },
        { status: 400 }
      )
    }
    if (to && !isValidDate(to)) {
      return NextResponse.json(
        { success: false, error: 'Invalid to date format. Use YYYY-MM-DD' },
        { status: 400 }
      )
    }

    const where: Record<string, unknown> = { type: TYPE }
    if (date) {
      where.sourceDate = date
    } else if (from || to) {
      where.sourceDate = {
        ...(from ? { gte: from } : {}),
        ...(to ? { lte: to } : {}),
      }
    }
    if (q) {
      where.OR = [
        { content: { contains: q, mode: 'insensitive' } },
        { sourceDate: { contains: q } },
      ]
    }

    const [total, docs] = await Promise.all([
      prisma.savedNote.count({ where }),
      prisma.savedNote.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          content: true,
          sourceDate: true,
          createdAt: true,
        },
      }),
    ])

    return NextResponse.json({
      success: true,
      data: docs,
      meta: { total, page, pageSize },
    })
  } catch (error) {
    console.error('Error fetching analysis documents:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch analysis documents' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!(await isAuthorized(request))) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    const body = await request.json()
    const { date, content } = body

    if (!date || !isValidDate(date)) {
      return NextResponse.json(
        { success: false, error: 'Date is required (format: YYYY-MM-DD)' },
        { status: 400 }
      )
    }

    if (!content || typeof content !== 'string' || !content.trim()) {
      return NextResponse.json(
        { success: false, error: 'Content is required' },
        { status: 400 }
      )
    }

    const doc = await prisma.savedNote.create({
      data: {
        content,
        sourceDate: date,
        type: TYPE,
      },
      select: {
        id: true,
        content: true,
        sourceDate: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ success: true, data: doc }, { status: 201 })
  } catch (error) {
    console.error('Error saving analysis document:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to save analysis document' },
      { status: 500 }
    )
  }
}
