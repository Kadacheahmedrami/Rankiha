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
      select: { id: true, email: true },
    });

    for (const user of usersToDelete) {
      // Delete comments authored by the user
      await prisma.comment.deleteMany({ where: { authorId: user.id } });
      // Delete comments where the user is the target
      await prisma.comment.deleteMany({ where: { targetUserId: user.id } });
      // Delete ratings given by the user
      await prisma.rating.deleteMany({ where: { userId: user.id } });
      // Delete ratings where the user is the rated recipient
      await prisma.rating.deleteMany({ where: { ratedUserId: user.id } });

      // Delete the user
      await prisma.user.delete({ where: { id: user.id } });
      console.log(`Deleted user and all related data: ${user.email}`);
    }

    return NextResponse.json({ message: 'Deletion process completed.' });
  } catch (error) {
    console.error('Error deleting inactive users:', error);
    return NextResponse.json({ error: 'Deletion process failed.' }, { status: 500 });
  }
}
