export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/prisma/prismaClient";
import { getServerAuthSession } from "@/lib/auth";
import { securityMiddleware } from "@/lib/security";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    // Fetch session and run security middleware.
    const session = await getServerAuthSession();
    const secCheck = await securityMiddleware(req, session);
    if (secCheck) return secCheck;

    const { id } = params;
    if (!id) {
      return NextResponse.json({ error: "Invalid event ID" }, { status: 400 });
    }

    // --- Query Event Details ---
    const event = await prisma.event.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        description: true,
        startDate: true,
        endDate: true,
      },
    });
    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // --- Query Leaderboard Data (without pagination) ---
    const articles = await prisma.$queryRaw<any[]>`
      SELECT 
        a.id,
        a.name,
        a.description,
        a."createdAt",
        COALESCE(AVG(r.value)::FLOAT, 0) as rating,
        COUNT(r.id) as "ratingsCount"
      FROM "Article" a
      LEFT JOIN "Rating" r ON a.id = r."ratedArticleId"
      WHERE a."eventId" = ${id} AND a.visible = true
      GROUP BY a.id
      ORDER BY rating DESC, "ratingsCount" DESC
    `;

    const totalCount = articles.length;

    // Get previous rankings (using ratings older than 24 hours) for change indicators.
    const previousRankings = await prisma.$queryRaw<any[]>`
      SELECT 
        a.id,
        COALESCE(AVG(r.value)::FLOAT, 0) as rating,
        COUNT(r.id) as "ratingsCount"
      FROM "Article" a
      LEFT JOIN "Rating" r ON a.id = r."ratedArticleId"
      WHERE a."eventId" = ${id} AND r."createdAt" < NOW() - INTERVAL '24 HOURS'
      GROUP BY a.id
      ORDER BY rating DESC, "ratingsCount" DESC
    `;
    const prevRankingsMap = new Map<string, number>();
    previousRankings.forEach((article, index) => {
      prevRankingsMap.set(article.id, index + 1);
    });

    // Build leaderboard with ranking and change indicator.
    const leaderboard = articles.map((article, index) => {
      const currentRank = index + 1;
      const previousRank = prevRankingsMap.get(article.id) || currentRank;
      let change: "up" | "down" | "same" = "same";
      if (previousRank < currentRank) change = "down";
      if (previousRank > currentRank) change = "up";
      return {
        id: article.id,
        name: article.name,
        description: article.description,
        rating: parseFloat(article.rating.toFixed(1)),
        ratingsCount: parseInt(article.ratingsCount),
        rank: currentRank,
        change,
      };
    });

    const responseData = {
      event,
      leaderboard: {
        data: leaderboard,
        total: totalCount,
      },
    };

    return NextResponse.json(responseData);
  } catch (error) {
    console.error("Error fetching article leaderboard:", error);
    return NextResponse.json(
      { error: "Failed to fetch article leaderboard" },
      { status: 500 }
    );
  }
}
