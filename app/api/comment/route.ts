import { NextRequest, NextResponse } from "next/server";
import Pusher from "pusher";
import { getServerAuthSession } from "@/app/lib/auth";
import { prisma } from "@/prisma/prismaClient";
import { BLACKLISTED_EMAILS } from "@/app/BLACKLIST/blacklist";

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
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.email && BLACKLISTED_EMAILS.includes(session.user.email)) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

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

    if (!targetUserId || !content || typeof content !== "string" || content.trim().length < 3 || content.trim().length > 500) {
      return NextResponse.json(
        { error: "Invalid comment content. Must be between 3 and 500 characters." },
        { status: 400 }
      );
    }

    if (session.user.id === targetUserId) {
      return NextResponse.json(
        { error: "You cannot comment on yourself" },
        { status: 400 }
      );
    }

    const userCommentCount = await prisma.comment.count({
      where: { authorId: session.user.id },
    });

    if (userCommentCount >= 150) {
      return NextResponse.json(
        { error: "Comment limit reached (150 comments max)." },
        { status: 403 }
      );
    }

    const comment = await prisma.comment.create({
      data: {
        content: content.trim(),
        author: { connect: { id: session.user.id } },
        targetUser: { connect: { id: targetUserId } },
      },
    });

    await pusher.trigger("comments", "comment-created", { comment });

    return NextResponse.json({ success: true, comment });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to save comment" },
      { status: 500 }
    );
  }
}
