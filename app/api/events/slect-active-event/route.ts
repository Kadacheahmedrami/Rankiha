export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/prisma/prismaClient";
import { getServerAuthSession } from "@/lib/auth";
import { securityMiddleware } from "@/lib/security";
import { BLACKLISTED_EMAILS } from "@/app/BLACKLIST/blacklist";

export async function GET(req: NextRequest) {
  try {
    // Fetch the current session.
    const session = await getServerAuthSession();

    // Run the security middleware check.
    const secCheck = await securityMiddleware(req, session);
    if (secCheck) return secCheck;

    // ✅ Define the current time for filtering events.
    const now = new Date();

    // ✅ Fetch one active event (ongoing).
    const activeEvent = await prisma.event.findFirst({
      where: {
        isActive: true,
        startDate: { lte: now },
        endDate: { gte: now },
      },
      orderBy: {
        startDate: "asc", // If multiple active events, return the earliest one.
      },
    });

    // Instead of throwing an error, return a successful response with data: null.
    if (!activeEvent) {
      return NextResponse.json({
        data: null,
        message: "No active event currently.",
      });
    }

    return NextResponse.json({ data: activeEvent });
  } catch (error) {
    console.error("Error fetching active event:", error);
    return NextResponse.json(
      { error: "Failed to fetch active event" },
      { status: 500 }
    );
  }
}
