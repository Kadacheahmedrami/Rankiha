import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from "@prisma/client";
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';

const prisma = new PrismaClient();

// PATCH - Update an existing rating
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const { value } = await request.json();

    // Validate input
    if (typeof value !== 'number' || value < 1 || value > 5) {
      return NextResponse.json({ error: 'Invalid rating value' }, { status: 400 });
    }

    // Get current user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get the rating and make sure it belongs to the current user
    const existingRating = await prisma.rating.findUnique({
      where: { id },
    });

    if (!existingRating) {
      return NextResponse.json({ error: 'Rating not found' }, { status: 404 });
    }

    if (existingRating.userId !== user.id) {
      return NextResponse.json({ error: 'Not authorized to update this rating' }, { status: 403 });
    }

    // Update the rating
    const updatedRating = await prisma.rating.update({
      where: { id },
      data: {
        value,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ rating: updatedRating });
  } catch (error) {
    console.error('Error updating rating:', error);
    return NextResponse.json({ error: 'Failed to update rating' }, { status: 500 });
  }
}

// DELETE - Remove a rating
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    // Get current user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get the rating and make sure it belongs to the current user
    const existingRating = await prisma.rating.findUnique({
      where: { id },
    });

    if (!existingRating) {
      return NextResponse.json({ error: 'Rating not found' }, { status: 404 });
    }

    if (existingRating.userId !== user.id) {
      return NextResponse.json({ error: 'Not authorized to delete this rating' }, { status: 403 });
    }

    // Delete the rating
    await prisma.rating.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting rating:', error);
    return NextResponse.json({ error: 'Failed to delete rating' }, { status: 500 });
  }
}