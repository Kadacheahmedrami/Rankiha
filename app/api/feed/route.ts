import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/prisma/prismaClient";
import { getServerAuthSession } from "@/app/lib/auth";
import { BLACKLISTED_EMAILS } from "@/app/BLACKLIST/blacklist";

export async function GET(req: NextRequest) {
  try {
    // Session & blacklist check
    const session = await getServerAuthSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.email && BLACKLISTED_EMAILS.includes(session.user.email)) {
      return NextResponse.json({ error: "You are banned" }, { status: 403 });
    }

    // Use separate pagination parameters for comments and posts
    const searchParams = req.nextUrl.searchParams;
    const commentsPage = parseInt(searchParams.get("commentsPage") || "1");
    const commentsLimit = parseInt(searchParams.get("commentsLimit") || "20");
    const commentsSkip = (commentsPage - 1) * commentsLimit;

    const postsPage = parseInt(searchParams.get("postsPage") || "1");
    const postsLimit = parseInt(searchParams.get("postsLimit") || "10");
    const postsSkip = (postsPage - 1) * postsLimit;

    // Fetch paginated comments
    const [comments, totalComments] = await Promise.all([
      prisma.comment.findMany({
        where: {
          visible: true,
          author: { visible: true },
          targetUser: { visible: true },
        },
        include: {
          targetUser: { select: { id: true, name: true, email: true } },
          author: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: commentsSkip,
        take: commentsLimit,
      }),
      prisma.comment.count({
        where: {
          visible: true,
          author: { visible: true },
          targetUser: { visible: true },
        },
      }),
    ]);

    // Fetch paginated posts
    const [posts, totalPosts] = await Promise.all([
      prisma.post.findMany({
        where: { visible: true },
        include: {
          author: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: postsSkip,
        take: postsLimit,
      }),
      prisma.post.count({ where: { visible: true } }),
    ]);

    // Format comments (you can adjust fields as needed)
    const formattedComments = comments.map((comment) => ({
      id: comment.id,
      content: comment.content,
      createdAt: comment.createdAt.toISOString(),
      targetUser: {
        id: comment.targetUser.id,
        name: comment.targetUser.name,
        email: comment.targetUser.email,
      },
    }));

    // Format posts (adjust fields as needed)
    const formattedPosts = posts.map((post) => ({
      id: post.id,
      title: post.title,
      imageUrl: post.imageUrl,
      createdAt: post.createdAt.toISOString(),
    }));

    return NextResponse.json({
      comments: {
        data: formattedComments,
        pagination: {
          total: totalComments,
          page: commentsPage,
          limit: commentsLimit,
          totalPages: Math.ceil(totalComments / commentsLimit),
        },
      },
      posts: {
        data: formattedPosts,
        pagination: {
          total: totalPosts,
          page: postsPage,
          limit: postsLimit,
          totalPages: Math.ceil(totalPosts / postsLimit),
        },
      },
    });
  } catch (error) {
    console.error("Error fetching feed:", error);
    return NextResponse.json({ error: "Failed to fetch feed" }, { status: 500 });
  }
}
