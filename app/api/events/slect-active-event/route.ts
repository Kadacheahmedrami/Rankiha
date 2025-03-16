export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/prisma/prismaClient"; // Ensure correct import path
import { getServerAuthSession } from "@/app/lib/auth";
import { BLACKLISTED_EMAILS } from "@/app/BLACKLIST/blacklist";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerAuthSession();

    // 🔐 Check if the user is authenticated
    if (!session || !session.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized access" },
        { status: 401 }
      );
    }

    // 🚫 Blacklist Check (Block specific users)
    if (BLACKLISTED_EMAILS.includes(session.user.email)) {
      
      return NextResponse.json(
        { error: "You are banned little guy" },
        { status: 403 }
      );
    }

    // ✅ Define the current time for filtering events
    const now = new Date();

    // ✅ Fetch one active event (ongoing)
    const activeEvent = await prisma.event.findFirst({
      where: {
        isActive: true,
        startDate: { lte: now },
        endDate: { gte: now },
      },
      orderBy: {
        startDate: "asc", // if multiple, return the earliest one
      },
    });

    // Instead of throwing an error, return a successful response with data: null
    if (!activeEvent) {
      return NextResponse.json({
        data: null,
        message: "No active event currently."
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
