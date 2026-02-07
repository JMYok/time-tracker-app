import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/entries/previous?date=YYYY-MM-DD&startTime=HH:MM - Get previous time entry
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const startTime = searchParams.get('startTime');

    if (!date || !startTime) {
      return NextResponse.json(
        { success: false, error: 'Date and startTime query parameters are required' },
        { status: 400 }
      );
    }

    // Parse the current time slot
    const [hour, minute] = startTime.split(':').map(Number);
    const currentDateTime = new Date(date);
    currentDateTime.setHours(hour, minute, 0, 0);

    // Calculate previous time slot (30 minutes earlier)
    const previousDateTime = new Date(currentDateTime);
    previousDateTime.setMinutes(previousDateTime.getMinutes() - 30);

    const previousDate = previousDateTime.toISOString().split('T')[0];
    const previousStartTime = `${String(previousDateTime.getHours()).padStart(2, '0')}:${String(previousDateTime.getMinutes()).padStart(2, '0')}`;

    // Find the previous entry
    const previousEntry = await prisma.timeEntry.findFirst({
      where: {
        date: previousDate,
        startTime: previousStartTime,
      },
    });

    if (!previousEntry) {
      return NextResponse.json(
        { success: true, data: null },
        { status: 200 }
      );
    }

    return NextResponse.json({ success: true, data: previousEntry });
  } catch (error) {
    console.error('Error fetching previous time entry:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch previous time entry' },
      { status: 500 }
    );
  }
}
