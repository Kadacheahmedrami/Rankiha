import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/prisma/prismaClient";

// GET: Fetch comments with pagination and target user information
export async function GET(req: NextRequest) {
  try {
    // Get pagination parameters
    const searchParams = req.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '20');
    const page = parseInt(searchParams.get('page') || '1');
    const skip = (page - 1) * limit;

    // Fetch paginated comments with their target user information
    const comments = await prisma.comment.findMany({
      include: {
        targetUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc' // Most recent comments first
      },
      skip,
      take: limit
    });

    // Get total count of comments
    const totalCount = await prisma.comment.count();
    const totalPages = Math.ceil(totalCount / limit);

    // Format the comments according to the interface
    const formattedComments = comments.map(comment => ({
      id: comment.id,
      content: comment.content,
      createdAt: comment.createdAt.toISOString(),
      targetUser: {
        id: comment.targetUser.id,
        name: comment.targetUser.name,
        email: comment.targetUser.email
      }
    }));

    return NextResponse.json({
      data: formattedComments,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages,
      },
    });
  } catch (error) {
    console.error("Error fetching comments:", error);
    return NextResponse.json({ error: "Failed to fetch comments" }, { status: 500 });
  }
}