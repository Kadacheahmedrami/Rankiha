import { NextRequest, NextResponse } from "next/server";
import Pusher from "pusher";
import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/prisma/prismaClient";
import { BLACKLISTED_EMAILS } from "@/app/BLACKLIST/blacklist";
import { securityMiddleware } from "@/lib/security";

// Initialize Pusher
const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID || "",
  key: process.env.PUSHER_KEY || "",
  secret: process.env.PUSHER_SECRET || "",
  cluster: process.env.PUSHER_CLUSTER || "eu",
  useTLS: true,
});

interface CommentRequestBody {
  targetUserId: string;
  content: string;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerAuthSession();

    // Run security middleware checks.
    const secCheck = await securityMiddleware(req, session);
    if (secCheck) return secCheck;

    // Additional check if session is missing
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Blacklist check is already handled by securityMiddleware,
    // but you can keep this additional check if needed.
    if (session.user.email && BLACKLISTED_EMAILS.includes(session.user.email)) {
      return NextResponse.json(
        { error: "you are banned little guy" },
        { status: 403 }
      );
    }

    // Upsert user in the database
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

    const body = (await req.json()) as CommentRequestBody;
    const { targetUserId, content } = body;

    // Validate the comment content
    if (
      !targetUserId ||
      !content ||
      typeof content !== "string" ||
      content.trim().length < 3 ||
      content.trim().length > 500
    ) {
      return NextResponse.json(
        { error: "Invalid comment content. Must be between 3 and 500 characters." },
        { status: 400 }
      );
    }

    // Prevent users from commenting on themselves
    if (session.user.id === targetUserId) {
      return NextResponse.json(
        { error: "You cannot comment on yourself" },
        { status: 400 }
      );
    }

    // Limit the number of comments a user can make
    const userCommentCount = await prisma.comment.count({
      where: { authorId: session.user.id },
    });

    if (userCommentCount >= 150) {
      return NextResponse.json(
        { error: "Comment limit reached (150 comments max)." },
        { status: 403 }
      );
    }

    // Create the comment in the database
    const comment = await prisma.comment.create({
      data: {
        content: content.trim(),
        author: { connect: { id: session.user.id } },
        targetUser: { connect: { id: targetUserId } },
      },
    });

    // Trigger a Pusher event to update listeners in real time
    await pusher.trigger("comments", "comment-created", { comment });

    return NextResponse.json({ success: true, comment });
  } catch (error) {
    console.error("Error saving comment:", error);
    return NextResponse.json(
      { error: "Failed to save comment" },
      { status: 500 }
    );
  }
}
