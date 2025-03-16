import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/prisma/prismaClient';
import { getServerAuthSession } from '@/lib/auth';
import { BLACKLISTED_EMAILS } from '@/app/BLACKLIST/blacklist';

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Retrieve the session to verify the authenticated user.
  const session = await getServerAuthSession();
  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Extra security: block action if the user's email is blacklisted.
  if (session.user.email && BLACKLISTED_EMAILS.includes(session.user.email)) {
    return NextResponse.json({ error: 'you are banned little guy' }, { status: 403 });
  }

  try {
    // Optionally, verify if the user is already deactivated.
    const existingUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { visible: true },
    });

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!existingUser.visible) {
      return NextResponse.json({ message: 'Your account is already deactivated.' });
    }

    // Deactivate the account by setting visible to false.
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: { visible: false },
    });

    return NextResponse.json({
      message:
        'Your account has been deactivated successfully. Your profile, ratings, and comments will no longer be visible on the platform. When you sign in again, your account will be reactivated.',
      visible: updatedUser.visible,
    });
  } catch (error) {
    console.error('Error deactivating account:', error);
    return NextResponse.json({ error: 'Failed to deactivate account' }, { status: 500 });
  }
}
