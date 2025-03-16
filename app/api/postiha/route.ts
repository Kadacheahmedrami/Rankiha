export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/prisma/prismaClient";
import { getServerAuthSession } from "@/lib/auth";
import { BLACKLISTED_EMAILS } from "@/app/BLACKLIST/blacklist";
import { z } from "zod";
import { securityMiddleware } from "@/lib/security";

// Zod schema to validate query parameters for pagination
const queryParamsSchema = z.object({
  page: z.preprocess(
    (arg) => (typeof arg === "string" ? parseInt(arg, 10) : arg),
    z.number().int().min(1).default(1)
  ),
  limit: z.preprocess(
    (arg) => (typeof arg === "string" ? parseInt(arg, 10) : arg),
    z.number().int().min(1).default(6)
  ),
});

export async function GET(req: NextRequest) {
  try {
    // Fetch session and run reusable security middleware.
    const session = await getServerAuthSession();
    const secCheck = await securityMiddleware(req, session);
    if (secCheck) return secCheck;

    // Validate and parse query parameters using Zod.
    const searchParams = req.nextUrl.searchParams;
    const { page, limit } = queryParamsSchema.parse({
      page: searchParams.get("page"),
      limit: searchParams.get("limit"),
    });
    const skip = (page - 1) * limit;

    // Get start of today for filtering posts
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Count posts created today by the user
    const userPostCount = await prisma.post.count({
      where: {
        authorId: session!.user!.id,
        createdAt: {
          gte: today,
        },
      },
    });

    if (userPostCount >= 10) {
      return NextResponse.json(
        { error: "You have reached your daily limit of 10 posts." },
        { status: 403 }
      );
    }

    // Fetch posts with pagination.
    const [posts, totalItems] = await Promise.all([
      prisma.post.findMany({
        where: { visible: true },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          votes: {
            select: { id: true, value: true, userId: true },
          },
          _count: {
            select: { votes: true },
          },
        },
      }),
      prisma.post.count({ where: { visible: true } }),
    ]);

    // Process posts: compute upvotes, downvotes, voteScore, etc.
    const processedPosts = posts.map((post) => {
      const upvotes = post.votes.filter((vote) => vote.value === 1).length;
      const downvotes = post.votes.filter((vote) => vote.value === -1).length;
      return {
        id: post.id,
        title: post.title,
        visible: post.visible,
        imageUrl: post.imageUrl,
        upvotes,
        downvotes,
        voteScore: upvotes - downvotes,
        totalVotes: post._count.votes,
        createdAt: post.createdAt,
      };
    });

    const responseData = {
      data: processedPosts,
      pagination: {
        totalItems,
        totalPages: Math.ceil(totalItems / limit),
        currentPage: page,
        limit,
      },
    };

    return (NextResponse.json(responseData));
  } catch (error) {
    console.error("Error fetching posts:", error);
    return NextResponse.json(
      { error: "Failed to fetch posts" },
      { status: 500 }
    );
  }
}
