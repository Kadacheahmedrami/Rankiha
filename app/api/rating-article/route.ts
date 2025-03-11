import { NextRequest, NextResponse } from "next/server";
import Pusher from "pusher";
import { getServerAuthSession } from "@/app/lib/auth";
import { prisma } from "@/prisma/prismaClient";
import { BLACKLISTED_EMAILS } from "@/app/BLACKLIST/blacklist";

// Initialize Pusher (using your environment variables)
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
    // Ensure the user is authenticated
    const session = await getServerAuthSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Block access if the authenticated user's email is blacklisted
    if (session.user.email && BLACKLISTED_EMAILS.includes(session.user.email)) {
      return NextResponse.json({ error: "Access forbidden" }, { status: 403 });
    }

    // Upsert the authenticated user to ensure they exist in the DB
    await prisma.user.upsert({
      where: { id: session.user.id },
      update: {},
      create: {
        id: session.user.id,
        email: session.user.email!,
        name: session.user.name || null,
        image: session.user.image || null,
      },
    });

    // Parse and validate the request body
    const body = (await req.json()) as ArticleRatingRequestBody;
    const { ratedArticleId, value } = body;

    if (
      !ratedArticleId ||
      typeof value !== "number" ||
      value < 1 ||
      value > 5
    ) {
        console.log(ratedArticleId, value)
      return NextResponse.json(
        { error: "Invalid rating data" },
        { status: 400 }
      );
    }

    // Upsert the rating using the composite unique key [userId, ratedArticleId]
    const rating = await prisma.rating.upsert({
      where: {
        userId_ratedArticleId: {
          userId: session.user.id,
          ratedArticleId,
        },
      },
      update: { value },
      create: {
        userId: session.user.id,
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

    // Trigger a Pusher event for real-time article leaderboard updates
    await pusher.trigger("article-leaderboard", "rating-updated", {
      articleId: ratedArticleId,
      averageRating: averageRatingRounded,
      ratingsCount: articleRatings.length,
    });

    return NextResponse.json({
      success: true,
      rating,
      averageRating: averageRatingRounded,
      ratingsCount: articleRatings.length,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: "Failed to save rating" },
      { status: 500 }
    );
  }
}
