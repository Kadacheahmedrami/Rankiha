// File: app/api/rating/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import Pusher from 'pusher';
import { getServerAuthSession } from '@/app/lib/auth';

const prisma = new PrismaClient();

// Initialize Pusher (using your env variables)
const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID || '',
  key: process.env.PUSHER_KEY || '',
  secret: process.env.PUSHER_SECRET || '',
  cluster: process.env.PUSHER_CLUSTER || 'eu',
  useTLS: true
});

export async function POST(req: NextRequest) {
  try {
    // Ensure the user is authenticated
    const session = await getServerAuthSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse the request body
    const body = await req.json();
    const { ratedUserId, value } = body;
    
    // Validate the rating data
    if (!ratedUserId || typeof value !== 'number' || value < 1 || value > 5) {
      return NextResponse.json({ error: "Invalid rating data" }, { status: 400 });
    }

    // Prevent users from rating themselves
    if (session.user.id === ratedUserId) {
      return NextResponse.json({ error: "You cannot rate yourself" }, { status: 400 });
    }
    
    // Upsert (create or update) the rating
    const rating = await prisma.rating.upsert({
      where: {
        userId_ratedUserId: {
          userId: session.user.id,
          ratedUserId,
        }
      },
      update: {
        value,
      },
      create: {
        userId: session.user.id,
        ratedUserId,
        value,
      }
    });
    
    // Calculate new average rating for the rated user
    const userRatings = await prisma.rating.findMany({
      where: { ratedUserId }
    });
    const totalRating = userRatings.reduce((sum, r) => sum + r.value, 0);
    const averageRating = totalRating / userRatings.length;
    
    // Trigger a Pusher event to update the leaderboard in real time
    await pusher.trigger('leaderboard', 'rating-updated', {
      userId: ratedUserId,
      averageRating,
      ratingsCount: userRatings.length,
    });
    
    return NextResponse.json({
      success: true,
      rating,
      averageRating,
      ratingsCount: userRatings.length
    });
  } catch (error) {
    console.error("Error creating/updating rating:", error);
    return NextResponse.json({ error: "Failed to save rating" }, { status: 500 });
  }
}
