import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';

const prisma = new PrismaClient();

// GET - Fetch ratings (either given by the user or received by the user)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'given' or 'received'
    const userId = searchParams.get('userId');

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    let ratings;
    if (type === 'given') {
      // Ratings given by the current user
      ratings = await prisma.rating.findMany({
        where: { userId: user.id },
        include: { ratedUser: true },
      });
    } else if (type === 'received') {
      // Ratings received by the current user
      ratings = await prisma.rating.findMany({
        where: { ratedUserId: user.id },
        include: { user: true },
      });
    } else if (userId) {
      // Ratings for a specific user (public profile view)
      ratings = await prisma.rating.findMany({
        where: { ratedUserId: userId },
        include: { user: true },
      });
    } else {
      return NextResponse.json({ error: 'Invalid request parameters' }, { status: 400 });
    }

    return NextResponse.json({ ratings });
  } catch (error) {
    console.error('Error fetching ratings:', error);
    return NextResponse.json({ error: 'Failed to fetch ratings' }, { status: 500 });
  }
}

// POST - Create a new rating
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { ratedUserId, value } = await request.json();

    // Validate input
    if (!ratedUserId || typeof value !== 'number' || value < 1 || value > 5) {
      return NextResponse.json({ error: 'Invalid input data' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Prevent users from rating themselves
    if (user.id === ratedUserId) {
      return NextResponse.json({ error: 'Cannot rate yourself' }, { status: 400 });
    }

    // Check if the user being rated exists
    const ratedUser = await prisma.user.findUnique({
      where: { id: ratedUserId },
    });

    if (!ratedUser) {
      return NextResponse.json({ error: 'User to rate not found' }, { status: 404 });
    }

    // Create or update the rating
    const rating = await prisma.rating.upsert({
      where: {
        userId_ratedUserId: {
          userId: user.id,
          ratedUserId,
        },
      },
      update: {
        value,
        updatedAt: new Date(),
      },
      create: {
        userId: user.id,
        ratedUserId,
        value,
      },
    });

    return NextResponse.json({ rating }, { status: 201 });
  } catch (error) {
    console.error('Error creating rating:', error);
    return NextResponse.json({ error: 'Failed to create rating' }, { status: 500 });
  }
}