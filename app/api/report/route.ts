import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/lib/auth";
import { prisma } from "@/prisma/prismaClient";
import { BLACKLISTED_EMAILS } from "@/app/BLACKLIST/blacklist";
export async function POST(req: NextRequest) {
  try {
    // Get the current session to verify the user is authenticated
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      return NextResponse.json(
        { message: "You must be logged in to report a comment" },
        { status: 401 }
      );
    }
    if (session.user.email && BLACKLISTED_EMAILS.includes(session.user.email)) {
      return NextResponse.json(
        { message: "You are banned little guy cannt report" },
        { status: 403 }
      );
    }

    // Parse the request body
    const body = await req.json();
    const { reporterUserId, commentId, timestamp } = body;

    // Verify the reporterUserId matches the authenticated user
    if (reporterUserId !== session.user.id) {
      return NextResponse.json(
        { message: "User ID mismatch" },
        { status: 403 }
      );
    }

    // Check if the comment exists
    const comment = await prisma.comment.findUnique({
      where: {
        id: commentId,
      },
    });

    if (!comment) {
      return NextResponse.json(
        { message: "Comment not found" },
        { status: 404 }
      );
    }

    // Check if the user has already reported this comment
    const existingReport = await prisma.commentReport.findUnique({
      where: {
        reporterUserId_commentId: {
          reporterUserId: session.user.id,
          commentId,
        },
      },
    });

    if (existingReport) {
      return NextResponse.json(
        { message: "You have already reported this comment" },
        { status: 409 }
      );
    }

    // Create the report
    const report = await prisma.commentReport.create({
      data: {
        reporterUserId: session.user.id,
        commentId,
        createdAt: new Date(timestamp),
      },
    });

    return NextResponse.json({
      message: "Comment reported successfully",
      reportId: report.id,
    });
  } catch (error) {
    console.error("Error reporting comment:", error);
    return NextResponse.json(
      { message: "An error occurred while reporting the comment" },
      { status: 500 }
    );
  }
}
