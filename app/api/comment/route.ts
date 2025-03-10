import { NextRequest, NextResponse } from "next/server";
import Pusher from "pusher";
import { getServerAuthSession } from "@/app/lib/auth";
import { prisma } from "@/prisma/prismaClient";
import { BLACKLISTED_EMAILS } from "@/app/BLACKLIST/blacklist";

// Initialize Pusher (using your environment variables)
const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID || "",
  key: process.env.PUSHER_KEY || "",
  secret: process.env.PUSHER_SECRET || "",
  cluster: process.env.PUSHER_CLUSTER || "eu",
  useTLS: true,
});

// Define the expected structure of the comment request body
interface CommentRequestBody {
  targetUserId: string;
  content: string;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // Ensure the user is authenticated
    const session = await getServerAuthSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Block access if the authenticated user's email is blacklisted
    if (session.user.email && BLACKLISTED_EMAILS.includes(session.user.email)) {
      return NextResponse.json(
        { error: "Niik moukk && swwa ta3 mouk" },
        { status: 403 }
      );
    }

    // Upsert the authenticated user to guarantee they exist in the DB
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

    // Parse and validate the request body
    const body = (await req.json()) as CommentRequestBody;
    const { targetUserId, content } = body;

    if (
      !targetUserId ||
      !content ||
      typeof content !== "string" ||
      content.trim() === ""
    ) {
      return NextResponse.json(
        { error: "Invalid comment data" },
        { status: 400 }
      );
    }

    // Optionally, prevent users from commenting on themselves
    if (session.user.id === targetUserId) {
      return NextResponse.json(
        { error: "You cannot comment on yourself" },
        { status: 400 }
      );
    }

    // Create the comment in the database
    const comment = await prisma.comment.create({
      data: {
        content,
        author: {
          connect: { id: session.user.id },
        },
        targetUser: {
          connect: { id: targetUserId },
        },
      },
    });

    // Trigger a Pusher event for real-time comment updates (optional)
    await pusher.trigger("comments", "comment-created", { comment });

    return NextResponse.json({ success: true, comment });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: "Failed to save comment" },
      { status: 500 }
    );
  }
}
