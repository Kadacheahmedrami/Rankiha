// app/api/honeypot/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/prisma/prismaClient';
import { getServerSession } from 'next-auth'; // Adjust import based on your auth setup


async function logHoneypotRequest(req: NextRequest) {
  // Get IP address
  const ip = req.headers.get('x-forwarded-for') || 
             req.ip || 
             'unknown';
  
  // Get user agent
  const userAgent = req.headers.get('user-agent') || 'unknown';
  
  // Get URL
  const url = req.url || 'unknown';
  
  // Convert headers to an object for storage
  const headersObj: Record<string, string> = {};
  req.headers.forEach((value, key) => {
    headersObj[key] = value;
  });

  // Try to get session data if available
  let email: string | null = null;
  let name: string | null = null;
  try {
    const session = await getServerSession();
    if (session && session.user) {
      email = session.user.email || null;
      name = session.user.name || null;
    }
  } catch (error) {
    console.error('Error retrieving session:', error);
  }

  // Save the log entry in the database
  await prisma.honeypotLog.create({
    data: {
      ip: typeof ip === 'string' ? ip : Array.isArray(ip) ? ip[0] : 'unknown',
      userAgent,
      url,
      headers: headersObj,
      email,
      name,
    },
  });
}

export async function GET(req: NextRequest) {
  await logHoneypotRequest(req);
  // Return a 404 status to appear more realistic
  return NextResponse.json(
    { message: "Resource not found" },
    { status: 404 }
  );
}

// You can also handle other HTTP methods to make it more convincing
export async function POST(req: NextRequest) {
  await logHoneypotRequest(req);
  return NextResponse.json(
    { message: "Method not allowed" },
    { status: 405 }
  );
}