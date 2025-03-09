import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/prisma/prismaClient';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const { id } = params;

    // Fetch the user from the database
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Derive username from email (e.g. "john.doe" from "john.doe@example.com")
    const username = user.email ? user.email.split('@')[0] : '';

    // Fetch all ratings received by this user
    const ratings = await prisma.rating.findMany({
      where: { ratedUserId: id },
    });

    const totalRatings = ratings.length;
    const totalRatingValue = ratings.reduce((sum, r) => sum + r.value, 0);
    const averageRating = totalRatings > 0 ? totalRatingValue / totalRatings : 0;

    // Calculate the rating distribution:
    // Index 0: 5-star, Index 1: 4-star, ... Index 4: 1-star.
    const distribution = [0, 0, 0, 0, 0];
    ratings.forEach((r) => {
      if (r.value >= 1 && r.value <= 5) {
        distribution[5 - r.value] += 1;
      }
    });

    // Build the profile object matching your Profile type
    const profile = {
      id: user.id,
      name: user.name || '',
      username,
      bio: '', // No bio field in your schema; default to empty string
      location: '', // No location field; default to empty string
      joinedDate: user.createdAt.toISOString(), // Format as needed
      rating: parseFloat(averageRating.toFixed(1)),
      totalRatings,
      ratingDistribution: distribution,
      image: user.image || '',
    };

    return NextResponse.json(profile);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json({ error: 'Failed to fetch user profile' }, { status: 500 });
  }
}
