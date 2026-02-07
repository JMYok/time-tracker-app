import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const TYPE = 'analysis'

const isValidDate = (date: string) => /^\d{4}-\d{2}-\d{2}$/.test(date)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')

    if (!date || !isValidDate(date)) {
      return NextResponse.json(
        { success: false, error: 'Date is required (format: YYYY-MM-DD)' },
        { status: 400 }
      )
    }

    const docs = await prisma.savedNote.findMany({
      where: { type: TYPE, sourceDate: date },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        content: true,
        sourceDate: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ success: true, data: docs })
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
