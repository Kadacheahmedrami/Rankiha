import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/prisma/prismaClient";
import { getServerAuthSession } from "@/lib/auth";
import { securityMiddleware } from "@/lib/security";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    // Retrieve session and run security middleware.
    const session = await getServerAuthSession();
    const secCheck = await securityMiddleware(req, session);
    if (secCheck) return secCheck;

    // Fetch the message from the database.
    const message = await prisma.message.findUnique({
      where: { id: params.id },
    });
    if (!message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    // Verify that the current user is the recipient.
    if (message.recipientId !== session!.user!.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Update the message with the current timestamp for readAt.
    const updatedMessage = await prisma.message.update({
      where: { id: params.id },
      data: { readAt: new Date() },
    });

    // Fetch sender and recipient information.
    const sender = await prisma.user.findUnique({
      where: { id: updatedMessage.senderId },
      select: { id: true, name: true },
    });
    const recipient = await prisma.user.findUnique({
      where: { id: updatedMessage.recipientId },
      select: { id: true, name: true },
    });

    // Format the response.
    const formattedMessage = {
      id: updatedMessage.id,
      content: updatedMessage.content,
      createdAt: updatedMessage.createdAt.toISOString(),
      readAt: updatedMessage.readAt ? updatedMessage.readAt.toISOString() : null,
      sender:
        updatedMessage.showName && sender?.name
          ? { id: sender.id, name: sender.name }
          : { name: "Anonymous" },
      recipient:
        recipient?.name
          ? { id: recipient.id, name: recipient.name }
          : { name: "Anonymous" },
    };

    return NextResponse.json({ message: formattedMessage });
  } catch (error: any) {
    console.error("Error marking message as read:", error);
    return NextResponse.json(
      { error: "Failed to mark message as read", details: error.message },
      { status: 500 }
    );
  }
}
