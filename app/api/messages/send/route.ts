import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/prisma/prismaClient";
import { getServerAuthSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body;
    try {
      body = await req.json();
    } catch (e) {
      return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 });
    }

    let { recipientId, content, parentId, includeSenderInfo } = body;

    // If recipientId is not provided but parentId is, try to get the recipientId from the parent's senderId.
    if (!recipientId && parentId) {
      const parentMessage = await prisma.message.findUnique({
        where: { id: parentId },
        select: { senderId: true },
      });
      if (parentMessage?.senderId) {
        recipientId = parentMessage.senderId;
      }
    }

    // Validate required fields
    const errors: string[] = [];
    if (!recipientId) errors.push("recipientId is required");
    if (recipientId && typeof recipientId !== "string") errors.push("recipientId must be a string");
    if (!content) errors.push("content is required");
    if (typeof content !== "string") errors.push("content must be a string");
    if (content.length > 1000) errors.push("content must be less than 1000 characters");
    if (parentId && typeof parentId !== "string") errors.push("parentId must be a string if provided");
    const showNameFlag = typeof includeSenderInfo === "boolean" ? includeSenderInfo : false;

    if (errors.length > 0) {
      console.error("Validation errors:", errors);
      return NextResponse.json({ error: "Validation failed", details: errors }, { status: 400 });
    }

    // Verify recipient exists
    const recipientExists = await prisma.user.findUnique({
      where: { id: recipientId },
    });
    if (!recipientExists) {
      return NextResponse.json({ error: "Recipient not found" }, { status: 404 });
    }

    // Create the message using the real senderId and the showName flag
    await prisma.message.create({
      data: {
        senderId: session.user.id,
        recipientId,
        content,
        parentId: parentId || null,
        showName: showNameFlag,
      },
    });

    // Return a simple success response
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error sending message:", error);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
