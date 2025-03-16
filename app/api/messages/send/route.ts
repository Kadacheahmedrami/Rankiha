import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/prisma/prismaClient";
import { getServerAuthSession } from "@/lib/auth";
import { securityMiddleware } from "@/lib/security";
import { z } from "zod";

// Zod schema for validating the message POST body.
const messageBodySchema = z.object({
  recipientId: z.string().optional(),
  content: z
    .string()
    .min(3, { message: "need more than three caraceters" })
    .max(300, { message: "Content must be less than or equal to 300 characters" }),
  parentId: z.string().optional(),
  includeSenderInfo: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  try {
    // Fetch session and run the reusable security middleware.
    const session = await getServerAuthSession();
    const secCheck = await securityMiddleware(req, session);
    if (secCheck) return secCheck;

    // Parse the JSON body.
    let body: unknown;
    try {
      body = await req.json();
    } catch (e) {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    // Validate the request body using Zod.
    const parsed = messageBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.errors },
        { status: 400 }
      );
    }
    let { recipientId, content, parentId, includeSenderInfo } = parsed.data;

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

    if (!recipientId) {
      return NextResponse.json(
        { error: "recipientId is required" },
        { status: 400 }
      );
    }

    // Verify that the recipient exists.
    const recipientExists = await prisma.user.findUnique({
      where: { id: recipientId },
    });
    if (!recipientExists) {
      return NextResponse.json(
        { error: "Recipient not found" },
        { status: 404 }
      );
    }

    // Determine the showName flag (default to false).
    const showNameFlag =
      typeof includeSenderInfo === "boolean" ? includeSenderInfo : false;

    // Create the message.
    await prisma.message.create({
      data: {
        senderId: session!.user!.id,
        recipientId,
        content,
        parentId: parentId || null,
        showName: showNameFlag,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error sending message:", error);
    return NextResponse.json(
      { error: "Failed to send message", details: error.message },
      { status: 500 }
    );
  }
}
