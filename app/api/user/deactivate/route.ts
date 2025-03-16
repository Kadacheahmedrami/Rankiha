import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/prisma/prismaClient";
import { getServerAuthSession } from "@/lib/auth";
import { securityMiddleware } from "@/lib/security";

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // Fetch session and run reusable security middleware.
    const session = await getServerAuthSession();
    const secCheck = await securityMiddleware(req, session);
    if (secCheck) return secCheck;

    // Optionally, verify if the user is already deactivated.
    const existingUser = await prisma.user.findUnique({
      where: { id: session!.user!.id },
      select: { visible: true },
    });

    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!existingUser.visible) {
      return NextResponse.json(
        { message: "Your account is already deactivated." },
        { status: 200 }
      );
    }

    // Deactivate the account by setting visible to false.
    const updatedUser = await prisma.user.update({
      where: { id: session!.user!.id },
      data: { visible: false },
    });

    return NextResponse.json({
      message:
        "Your account has been deactivated successfully. Your profile, ratings, and comments will no longer be visible on the platform. When you sign in again, your account will be reactivated.",
      visible: updatedUser.visible,
    });
  } catch (error) {
    console.error("Error deactivating account:", error);
    return NextResponse.json(
      { error: "Failed to deactivate account" },
      { status: 500 }
    );
  }
}
