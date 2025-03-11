import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/prisma/prismaClient";
import {getServerAuthSession} from '@/app/lib/auth'
// GET: Fetch comments with pagination and target user information
export async function GET(req: NextRequest) {
  try {
    const session = await getServerAuthSession();
    
    // Get pagination parameters
    const searchParams = req.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "20");
    const page = parseInt(searchParams.get("page") || "1");
    const skip = (page - 1) * limit;

    // Fetch paginated comments where the comment is visible and both author and target user are visible
    const comments = await prisma.comment.findMany({
      where: {
        visible: true, // Ensure only visible comments are fetched
        author: { visible: { equals: true } }, // Ensure the author is visible
        targetUser: { visible: { equals: true } }, // Ensure the target user is visible
      },
      include: {
        targetUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      skip,
      take: limit,
    });
    

    // Get total count of visible comments
    const totalCount = await prisma.comment.count({
      where: {
        visible: true,
        author: { visible: true },
        targetUser: { visible: true },
      },
    });

    const totalPages = Math.ceil(totalCount / limit);

    // Format the comments according to the interface
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
    return NextResponse.json(
      { error: "Failed to fetch comments" },
      { status: 500 }
    );
  }
}
