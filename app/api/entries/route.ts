import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/entries?date=YYYY-MM-DD - Get all entries for a specific date
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    if (!date) {
      return NextResponse.json(
        { success: false, error: 'Date query parameter is required (format: YYYY-MM-DD)' },
        { status: 400 }
      );
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return NextResponse.json(
        { success: false, error: 'Invalid date format. Use YYYY-MM-DD' },
        { status: 400 }
      );
    }

    const entries = await prisma.timeEntry.findMany({
      where: { date },
      orderBy: { startTime: 'asc' },
    });

    return NextResponse.json({ success: true, entries });
  } catch (error) {
    console.error('Error fetching time entries:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch time entries' },
      { status: 500 }
    );
  }
}

// POST /api/entries - Create a new time entry
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { date, startTime, endTime, activity, thought, isSameAsPrevious } = body;

    // Validate required fields (activity can be empty, but thought should be present if activity is empty)
    if (!date || !startTime || !endTime) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: date, startTime, endTime' },
        { status: 400 }
      );
    }

    // Allow creation if either activity OR thought is present (or both)
    const hasActivity = activity && activity.trim();
    const hasThought = thought && thought.trim();

    // Only reject if BOTH are empty
    if (!hasActivity && !hasThought) {
      return NextResponse.json({ success: true, data: null }, { status: 200 });
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return NextResponse.json(
        { success: false, error: 'Invalid date format. Use YYYY-MM-DD' },
        { status: 400 }
      );
    }

    // Validate time format (HH:MM)
    const timeRegex = /^\d{2}:\d{2}$/;
    if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
      return NextResponse.json(
        { success: false, error: 'Invalid time format. Use HH:MM' },
        { status: 400 }
      );
    }

    const entry = await prisma.timeEntry.create({
      data: {
        date,
        startTime,
        endTime,
        activity,
        thought: thought || null,
        isSameAsPrevious: isSameAsPrevious || false,
      },
    });

    return NextResponse.json({ success: true, data: entry }, { status: 201 });
  } catch (error) {
    console.error('Error creating time entry:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create time entry' },
      { status: 500 }
    );
  }
}
