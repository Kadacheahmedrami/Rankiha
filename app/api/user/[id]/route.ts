import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/prisma/prismaClient";
import { BLACKLISTED_EMAILS } from "@/app/BLACKLIST/blacklist";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const { id } = params;
    if (!id) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    // Fetch the user from the database, including the "visible" field.
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        createdAt: true,
        visible: true,
      },
    });

    // If no user is found or the user is deactivated (visible: false), return 404.
    if (!user || !user.visible) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Block access if the user's email is blacklisted.
    if (user.email && BLACKLISTED_EMAILS.includes(user.email)) {
      return NextResponse.json({ error: "Niik moukk" }, { status: 403 });
    }

    // Derive username from email (e.g. "john.doe" from "john.doe@example.com").
    const username = user.email ? user.email.split("@")[0] : "";

    // Fetch all ratings received by this user.
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

    // Fetch all visible comments received by this user.
    const comments = await prisma.comment.findMany({
      where: { targetUserId: id, visible: true },
      select: {
        id: true,
        content: true,
        createdAt: true,
    
      },
      orderBy: { createdAt: "desc" },
    });

    // Format comments, converting createdAt dates to ISO strings.
    const formattedComments = comments.map((comment) => ({
      content: comment.content,
      createdAt: comment.createdAt.toISOString(),
    }));

    // Build the profile object matching your Profile type.
    const profile = {
      id: user.id,
      name: user.name || "",
      username,
      bio: "", // Default value as no bio field exists.
      location: "", // Default value as no location field exists.
      joinedDate: user.createdAt.toISOString(),
      rating: parseFloat(averageRating.toFixed(1)),
      totalRatings,
      ratingDistribution: distribution,
      comments: formattedComments,
    };

    return NextResponse.json(profile);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch user profile" },
      { status: 500 }
    );
  }
}
