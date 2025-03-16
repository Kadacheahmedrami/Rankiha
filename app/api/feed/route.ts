export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/prisma/prismaClient";
import { getServerAuthSession } from "@/lib/auth";
import { securityMiddleware } from "@/lib/security";
import { z } from "zod";
import { encrypt } from "@/lib/encryption";

// Constants for pagination (could also be moved to a config file)
const DEFAULT_PAGE_SIZE = 20;

// Zod schema to validate query parameters for pagination
const queryParamsSchema = z.object({
  search: z.string().optional(),
  limit: z.number().int().min(1).max(30).optional(),
  page: z.number().int().min(1).optional()
});

export async function GET(req: NextRequest) {
  try {
    // Fetch session and run reusable security middleware.
    const session = await getServerAuthSession();
    const secCheck = await securityMiddleware(req, session);
    if (secCheck) return secCheck;

    // Validate and parse query parameters using Zod.
    const searchParams = req.nextUrl.searchParams;
    const { search = "", limit = DEFAULT_PAGE_SIZE, page = 1 } =
      queryParamsSchema.parse({
        search: searchParams.get("search") || undefined,
        limit: searchParams.get("limit")
          ? parseInt(searchParams.get("limit") as string)
          : undefined,
        page: searchParams.get("page")
          ? parseInt(searchParams.get("page") as string)
          : undefined,
      });
    const commentsPage = page; // or use separate schema if needed
    const commentsLimit = limit;
    const commentsSkip = (commentsPage - 1) * commentsLimit;

    const postsPage = page;
    const postsLimit = 10; // You could also validate this with Zod if needed
    const postsSkip = (postsPage - 1) * postsLimit;

    // Fetch paginated comments.
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

    // Fetch paginated posts.
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

    // Format and encrypt comments.
    const formattedComments = comments.map((comment) => ({
      id: encrypt(comment.id),
      content: encrypt(comment.content),
      createdAt: encrypt(comment.createdAt.toISOString()),
      targetUser: {
        id: encrypt(comment.targetUser.id),
        name: encrypt(comment.targetUser.name!),
        email: encrypt(comment.targetUser.email),
      },
    }));

    // Format and encrypt posts.
    const formattedPosts = posts.map((post) => ({
      id: encrypt(post.id),
      title: encrypt(post.title),
      imageUrl: encrypt(post.imageUrl),
      createdAt: encrypt(post.createdAt.toISOString()),
    }));

    // Pagination remains unencrypted for client usability.
    const responseData = {
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
    };

    return (NextResponse.json(responseData));
  } catch (error) {
    console.error("Error fetching feed:", error);
    return NextResponse.json({ error: "Failed to fetch feed" }, { status: 500 });
  }
}
