export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/prisma/prismaClient";
import { getServerAuthSession } from "@/lib/auth";
import { securityMiddleware } from "@/lib/security";

export async function GET(req: NextRequest) {
  try {
    // Retrieve session and run security middleware.
    const session = await getServerAuthSession();
    const secCheck = await securityMiddleware(req, session);
    if (secCheck) return secCheck;

    // Now that security middleware passed, we can assume session and session.user exist.
    const events = await prisma.event.findMany();
    return NextResponse.json({ data: events });
  } catch (error) {
    console.error("Error fetching events:", error);
    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500 }
    );
  }
}
