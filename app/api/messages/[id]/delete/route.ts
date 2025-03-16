

// POST route - Delete message (soft delete)
// app/api/messages/[id]/delete/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/prisma/prismaClient";
import { getServerAuthSession } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const message = await prisma.message.findUnique({
      where: { id: params.id },
    });

    if (!message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    // Verify user is either sender or recipient
    if (
      message.senderId !== session.user.id &&
      message.recipientId !== session.user.id
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Soft delete the message
    const updatedMessage = await prisma.message.update({
      where: { id: params.id },
      data: { isHidden: true },
    });

    // Get sender and recipient info separately
    const sender = await prisma.user.findUnique({
      where: { id: updatedMessage.senderId },
      select: { id: true, name: true },
    });

    const recipient = await prisma.user.findUnique({
      where: { id: updatedMessage.recipientId },
      select: { id: true, name: true },
    });

    // Format the response
    const formattedMessage = {
      id: updatedMessage.id,
      content: updatedMessage.content,
      createdAt: updatedMessage.createdAt.toISOString(),
      readAt: updatedMessage.readAt ? updatedMessage.readAt.toISOString() : null,
      sender: updatedMessage.showName && sender?.name
        ? { id: sender.id, name: sender.name }
        : { name: "Anonymous" },
      recipient: recipient?.name
        ? { id: recipient.id, name: recipient.name }
        : { name: "Anonymous" },
    };

    return NextResponse.json({ message: formattedMessage });
  } catch (error) {
    console.error("Error deleting message:", error);
    return NextResponse.json({ error: "Failed to delete message" }, { status: 500 });
  }
}