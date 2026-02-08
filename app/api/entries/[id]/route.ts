import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAuthorized } from '@/lib/auth';

// GET /api/entries/[id] - Get a single time entry by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await isAuthorized(request))) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await params;

    const entry = await prisma.timeEntry.findUnique({
      where: { id },
    });

    if (!entry) {
      return NextResponse.json(
        { success: false, error: 'Time entry not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: entry });
  } catch (error) {
    console.error('Error fetching time entry:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch time entry' },
      { status: 500 }
    );
  }
}

// PUT /api/entries/[id] - Update a time entry
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await isAuthorized(request))) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await params;
    const body = await request.json();
    const { activity, thought, isSameAsPrevious } = body;

    // Check if entry exists
    const existingEntry = await prisma.timeEntry.findUnique({
      where: { id },
    });

    if (!existingEntry) {
      return NextResponse.json(
        { success: false, error: 'Time entry not found' },
        { status: 404 }
      );
    }

    // Build update data object with only provided fields
    const updateData: {
      activity?: string;
      thought?: string | null;
      isSameAsPrevious?: boolean;
    } = {};

    if (activity !== undefined) updateData.activity = activity;
    if (thought !== undefined) updateData.thought = thought || null;
    if (isSameAsPrevious !== undefined) updateData.isSameAsPrevious = isSameAsPrevious;

    const updatedEntry = await prisma.timeEntry.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, data: updatedEntry });
  } catch (error) {
    console.error('Error updating time entry:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update time entry' },
      { status: 500 }
    );
  }
}

// DELETE /api/entries/[id] - Delete a time entry
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await isAuthorized(request))) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await params;

    // Check if entry exists
    const existingEntry = await prisma.timeEntry.findUnique({
      where: { id },
    });

    if (!existingEntry) {
      return NextResponse.json(
        { success: false, error: 'Time entry not found' },
        { status: 404 }
      );
    }

    await prisma.timeEntry.delete({
      where: { id },
    });

    return NextResponse.json(
      { success: true, data: { message: 'Time entry deleted successfully' } }
    );
  } catch (error) {
    console.error('Error deleting time entry:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete time entry' },
      { status: 500 }
    );
  }
}
