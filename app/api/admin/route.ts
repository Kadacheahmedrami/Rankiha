// pages/api/honeypot.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/prisma/prismaClient';
import { getServerAuthSession } from '@/app/lib/auth'; // Adjust import as needed

async function logHoneypotRequest(req: NextApiRequest) {
  const ip =
    req.headers['x-forwarded-for'] ||
    req.connection.remoteAddress ||
    'unknown';
  const userAgent = req.headers['user-agent'] || 'unknown';
  const url = req.url || 'unknown';
  const headers = req.headers;

  // Attempt to get the session data if the request is authenticated
  let email: string | null = null;
  let name: string | null = null;
  try {
    const session = await getServerAuthSession();
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
      headers,
      email,
      name,
    },
  });
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  await logHoneypotRequest(req);
  // Return a generic response
  res.status(200).json({ message: 'Resource not found' });
}
