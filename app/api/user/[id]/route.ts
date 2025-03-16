export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/prisma/prismaClient";
import { getServerAuthSession } from "@/lib/auth";
import { BLACKLISTED_EMAILS } from "@/app/BLACKLIST/blacklist";
import { securityMiddleware } from "@/lib/security";
import { z } from "zod";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    // Run security middleware: this checks for a valid session, CSRF, rate limiting, etc.
    const session = await getServerAuthSession();
    const secCheck = await securityMiddleware(req, session);
    if (secCheck) return secCheck;

    const { id } = params;
    if (!id) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    // Fetch the target user from the database.
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

    // If no user is found or the user is deactivated, return 404.
    if (!user || !user.visible) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Block access if the target user's email is blacklisted.
    if (user.email && BLACKLISTED_EMAILS.includes(user.email)) {
      return NextResponse.json(
        { error: "You are banned little guy" },
        { status: 403 }
      );
    }

    // Derive username (e.g., from the email).
    const username = user.email ? user.email : "";

    // Fetch all ratings received by this user.
    const ratings = await prisma.rating.findMany({
      where: { ratedUserId: id },
    });
    const totalRatings = ratings.length;
    const totalRatingValue = ratings.reduce((sum, r) => sum + r.value, 0);
    const averageRating = totalRatings > 0 ? totalRatingValue / totalRatings : 0;

    // Calculate rating distribution: index 0 -> 5-star, index 1 -> 4-star, etc.
    const distribution = [0, 0, 0, 0, 0];
    ratings.forEach((r) => {
      if (r.value >= 1 && r.value <= 5) {
        distribution[5 - r.value] += 1;
      }
    });

    // Fetch all visible comments received by this user.
    const comments = await prisma.comment.findMany({
      where: { targetUserId: id, visible: true },
      select: { id: true, content: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });

    // Format comments: convert dates to ISO strings.
    const formattedComments = comments.map((comment) => ({
      content: comment.content,
      createdAt: comment.createdAt.toISOString(),
    }));

    // Build the profile object.
    const profile = {
      id: user.id,
      name: user.name || "",
      username,
      bio: "",
      location: "",
      rating: parseFloat(averageRating.toFixed(2)),
      totalRatings,
      ratingDistribution: distribution,
      comments: formattedComments,
    };

    return NextResponse.json(profile);
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch user profile" },
      { status: 500 }
    );
  }
}
