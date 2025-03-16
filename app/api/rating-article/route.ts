import { NextRequest, NextResponse } from "next/server";
import Pusher from "pusher";
import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/prisma/prismaClient";

import { securityMiddleware } from "@/lib/security";

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID || "",
  key: process.env.PUSHER_KEY || "",
  secret: process.env.PUSHER_SECRET || "",
  cluster: process.env.PUSHER_CLUSTER || "eu",
  useTLS: true,
});

interface ArticleRatingRequestBody {
  ratedArticleId: string;
  value: number;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerAuthSession();
    const secCheck = await securityMiddleware(req, session);
    if (secCheck) return secCheck;

    // At this point, session and session.user are guaranteed.
    const body = (await req.json()) as ArticleRatingRequestBody;
    const { ratedArticleId, value } = body;

    if (!ratedArticleId || typeof value !== "number" || value < 1 || value > 5) {
      return NextResponse.json(
        { error: "Invalid rating data" },
        { status: 400 }
      );
    }

    // Upsert the vote using the composite unique key [userId, ratedArticleId]
    const rating = await prisma.rating.upsert({
      where: {
        userId_ratedArticleId: {
          userId: session!.user!.id,
          ratedArticleId,
        },
      },
      update: { value },
      create: {
        userId: session!.user!.id,
        ratedArticleId,
        value,
      },
    });

    // Calculate new average rating for the article
    const articleRatings = await prisma.rating.findMany({
      where: { ratedArticleId },
    });
    const totalRating = articleRatings.reduce((sum, r) => sum + r.value, 0);
    const averageRating = totalRating / articleRatings.length;
    const averageRatingRounded = parseFloat(averageRating.toFixed(1));

    // Trigger a Pusher event for real-time article leaderboard updates.
    await pusher.trigger("article-leaderboard", "rating-updated", {
      articleId: ratedArticleId,
      averageRating: averageRatingRounded,
      ratingsCount: articleRatings.length,
    });

    return (
      NextResponse.json({
        success: true,
        rating,
        averageRating: averageRatingRounded,
        ratingsCount: articleRatings.length,
      })
    );
  } catch (error: unknown) {
    console.error("Error processing vote:", error);
    return NextResponse.json(
      { error: "Failed to save rating" },
      { status: 500 }
    );
  }
}
