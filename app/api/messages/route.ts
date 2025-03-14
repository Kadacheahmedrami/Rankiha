import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/prisma/prismaClient";
import { getServerAuthSession } from "@/app/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch messages where the current user is the recipient.
    // You can add additional conditions if needed.
    const messages = await prisma.message.findMany({
      where: {
        OR: [{ recipientId: session.user.id }],
        isHidden: false, // Only include messages that haven't been soft-deleted
      },
      orderBy: { createdAt: "desc" },
    });

    // Format each message. If a parentId exists, load the parent message details.
    const formattedMessages = await Promise.all(
      messages.map(async (message) => {
        const sender = await prisma.user.findUnique({
          where: { id: message.senderId },
          select: { id: true, name: true },
        });

        const recipient = await prisma.user.findUnique({
          where: { id: message.recipientId },
          select: { id: true, name: true },
        });

        let parent = null;
        if (message.parentId) {
          const parentMessage = await prisma.message.findUnique({
            where: { id: message.parentId },
            select: { id: true, content: true, createdAt: true },
          });
          if (parentMessage) {
            parent = {
              id: parentMessage.id,
              content: parentMessage.content,
              createdAt: parentMessage.createdAt.toISOString(),
            };
          }
        }

        return {
          id: message.id,
          content: message.content,
          createdAt: message.createdAt.toISOString(),
          readAt: message.readAt ? message.readAt.toISOString() : null,
          sender: message.showName && sender?.name
            ? { id: sender.id, name: sender.name }
            : { name: "Anonymous" },
          recipient: recipient?.name
            ? { id: recipient.id, name: recipient.name }
            : { name: "Anonymous" },
          parent, 
          senderName:  message.showName && sender?.name
          ?  sender?.name 
          :  "Anonymous" ,
        };
      })
    );

    return NextResponse.json({ messages: formattedMessages });
  } catch (error) {
    console.error("Error fetching messages:", error);
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
  }
}
