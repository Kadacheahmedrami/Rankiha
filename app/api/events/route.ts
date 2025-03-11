import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/prisma/prismaClient"; // Ensure correct import path
import { getServerAuthSession } from "@/app/lib/auth";
import { BLACKLISTED_EMAILS } from "@/app/BLACKLIST/blacklist";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerAuthSession();

    // 🔐 1. Check if the user is authenticated
    if (!session || !session.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized access" },
        { status: 401 } // 401 = Unauthorized
      );
    }

    // 🚫 2. Blacklist Check (Block specific users)
    if (BLACKLISTED_EMAILS.includes(session.user.email)) {
      return NextResponse.json(
        { error: "Forbidden: You are not allowed to access this resource" },
        { status: 403 } // 403 = Forbidden
      );
    }



    // ✅ 4. Fetch all events from the database (Only if all checks pass)
    const events = await prisma.event.findMany();
    return NextResponse.json({ data: events });
  } catch (error) {
    console.error("Error fetching events:", error);
    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500 } // 500 = Internal Server Error
    );
  }
}
