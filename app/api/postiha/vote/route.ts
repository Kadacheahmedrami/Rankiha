import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/prisma/prismaClient";
import { BLACKLISTED_EMAILS } from "@/app/BLACKLIST/blacklist";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { message: "You must be logged in to vote" },
        { status: 401 }
      );
    }

    if (session.user.email && BLACKLISTED_EMAILS.includes(session.user.email)) {
      return NextResponse.json(
        { error: "You are banned little gut" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { postId, voteType } = body;

    if (!postId) {
      return NextResponse.json(
        { message: "Post ID is required" },
        { status: 400 }
      );
    }

    // Check if voteType is valid
    if (!voteType || !["upvote", "downvote", "reset"].includes(voteType)) {
      return NextResponse.json(
        { message: "Valid vote type (upvote, downvote, or reset) is required" },
        { status: 400 }
      );
    }

    const post = await prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      return NextResponse.json({ message: "Post not found" }, { status: 404 });
    }

    if (!post.visible) {
      return NextResponse.json(
        { message: "This post is no longer available" },
        { status: 403 }
      );
    }

    const existingVote = await prisma.vote.findUnique({
      where: {
        userId_postId: {
          userId: session.user.id,
          postId: postId,
        },
      },
    });

    const result = await prisma.$transaction(async (tx) => {
      // Case 1: "reset" - Remove an existing vote
      if (voteType === "reset") {
        if (!existingVote) {
          return post; // Nothing to reset
        }

        const updatedPost = await tx.post.update({
          where: { id: postId },
          data: {
            upvotes: existingVote.value === 1 ? { decrement: 1 } : undefined,
            downvotes: existingVote.value === -1 ? { decrement: 1 } : undefined,
          },
        });

        // Delete the vote record
        await tx.vote.delete({
          where: {
            userId_postId: {
              userId: session.user!.id,
              postId: postId,
            },
          },
        });

        return updatedPost;
      }

      // Set vote value based on vote type
      const voteValue = voteType === "upvote" ? 1 : -1;

      // Case 2: No existing vote - create a new vote
      if (!existingVote) {
        const updatedPost = await tx.post.update({
          where: { id: postId },
          data: {
            [voteType === "upvote" ? "upvotes" : "downvotes"]: {
              increment: 1,
            },
          },
        });

        await tx.vote.create({
          data: {
            userId: session.user!.id,
            postId: postId,
            value: voteValue,
          },
        });

        return updatedPost;
      }

      // Case 3: Changing vote direction (upvote to downvote or vice versa)
      if (
        (existingVote.value === 1 && voteType === "downvote") ||
        (existingVote.value === -1 && voteType === "upvote")
      ) {
        const updatedPost = await tx.post.update({
          where: { id: postId },
          data: {
            upvotes: {
              [existingVote.value === 1 ? "decrement" : "increment"]: 1,
            },
            downvotes: {
              [existingVote.value === -1 ? "decrement" : "increment"]: 1,
            },
          },
        });

        await tx.vote.update({
          where: {
            userId_postId: {
              userId: session.user!.id,
              postId: postId,
            },
          },
          data: {
            value: voteValue,
          },
        });

        return updatedPost;
      }

      // Case 4: Same vote type again (shouldn't happen with frontend changes)
      return post;
    });

    // Fetch the current vote status after transaction
    const currentVote = await prisma.vote.findUnique({
      where: {
        userId_postId: {
          userId: session.user.id,
          postId: postId,
        },
      },
      select: {
        value: true,
      },
    });

    return NextResponse.json({
      message: "Vote processed successfully",
      post: {
        id: result.id,
        upvotes: result.upvotes,
        downvotes: result.downvotes,
      },
      currentVote: currentVote,
    });
  } catch (error: any) {
    console.error("Error processing vote:", error);
    return NextResponse.json(
      { message: "Failed to process vote", error: error.message },
      { status: 500 }
    );
  }
}
