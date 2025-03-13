import { NextResponse } from 'next/server';
import { prisma } from "@/prisma/prismaClient";


export async function GET(request: Request) {
  // Verify the request is coming from your cron job
  if (request.headers.get('Authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

    // Find users with visible set to false and updated more than three days ago
    const usersToDelete = await prisma.user.findMany({
      where: {
        visible: false,
        updatedAt: { lt: threeDaysAgo },
      },
    });

    // Delete each found user
    for (const user of usersToDelete) {
      await prisma.user.delete({ where: { id: user.id } });
      console.log(`Deleted user: ${user.email}`);
    }

    return NextResponse.json({ message: 'Deletion process completed.' });
  } catch (error) {
    console.error('Error deleting inactive users:', error);
    return NextResponse.json({ error: 'Deletion process failed.' }, { status: 500 });
  }
}
