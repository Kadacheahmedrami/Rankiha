import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/prisma/prismaClient";
import { getServerAuthSession } from "@/app/lib/auth";
import {BLACKLISTED_EMAILS} from "@/app/BLACKLIST/blacklist";
export async function GET(request: NextRequest) {
  try {
    const session = await getServerAuthSession();

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if(session.user.email && BLACKLISTED_EMAILS.includes(session.user.email)){
      return NextResponse.json({ error: "you are banned little guy" }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = Number.parseInt(searchParams.get("page") || "1");
    const limit = Number.parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    // Get posts with pagination using Prisma
    const [posts, totalItems] = await Promise.all([
      prisma.post.findMany({
        skip,
        take: limit,
        orderBy: {
          createdAt: "desc",
        },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
          votes: {
            select: {
              id: true,
              value: true,
              userId: true,
            },
          },
          _count: {
            select: {
              votes: true,
            },
          },
        },
      }),
      prisma.post.count(),
    ]);

    const processedPosts = posts.map((post) => {
      const upvotes = post.votes.filter((vote) => vote.value === 1).length;
      const downvotes = post.votes.filter((vote) => vote.value === -1).length;

      const { votes, ...postWithoutVotes } = post;

      return {
        ...postWithoutVotes,
        upvotes,
        downvotes,
        voteScore: upvotes - downvotes,
        totalVotes: post._count.votes,
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
    return NextResponse.json(
      { error: "Failed to fetch posts" },
      { status: 500 }
    );
  }
}
