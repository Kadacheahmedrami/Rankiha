export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/prisma/prismaClient";
import { getServerAuthSession } from "@/lib/auth";
import { BLACKLISTED_EMAILS } from "@/app/BLACKLIST/blacklist";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerAuthSession();

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.email && BLACKLISTED_EMAILS.includes(session.user.email)) {
      return NextResponse.json(
        { error: "you are banned little guy" },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const page = Number.parseInt(searchParams.get("page") || "1");
    const limit = Number.parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    // Get start of today for filtering posts
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Count posts created today by the user
    const userPostCount = await prisma.post.count({
      where: {
        authorId: session.user.id,
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

    // Fetch posts
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

    // Process posts
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

    return NextResponse.json({
      data: processedPosts,
      pagination: {
        totalItems,
        totalPages: Math.ceil(totalItems / limit),
        currentPage: page,
        limit,
      },
    });
  } catch (error) {
    console.error("Error fetching posts:", error);
    return NextResponse.json(
      { error: "Failed to fetch posts" },
      { status: 500 }
    );
  }
}
