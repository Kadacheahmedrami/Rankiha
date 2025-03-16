import { type NextRequest, NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/prisma/prismaClient";

import { securityMiddleware } from "@/lib/security";
import { z } from "zod";

// Define a Zod schema for the request body.
const postBodySchema = z.object({
  imgUrl: z.string().nonempty("No file provided"),
  title: z.string().nonempty("Title is required"),
});

interface PostBody extends z.infer<typeof postBodySchema> {}

export async function POST(request: NextRequest) {
  try {
    // Fetch session and run the reusable security middleware.
    const session = await getServerAuthSession();
    const secCheck = await securityMiddleware(request, session);
    if (secCheck) return secCheck;

    // Parse and validate the request body using Zod.
    const body = await request.json();
    const parsedBody = postBodySchema.parse(body) as PostBody;

    // Check that the user exists in the DB.
    const user = await prisma.user.findUnique({
      where: { id: session!.user!.id },
    });
    if (!user) {
      return NextResponse.json(
        { error: "The id is invalid!" },
        { status: 403 }
      );
    }

    // Create the post.
    const post = await prisma.post.create({
      data: {
        title: parsedBody.title,
        imageUrl: parsedBody.imgUrl,
        authorId: session!.user!.id,
      },
    });

    return (NextResponse.json(post, { status: 201 }));
  } catch (error: any) {
    console.error("Error uploading file:", error);
    return NextResponse.json(
      { error: "Failed to upload file", message: error.message },
      { status: 500 }
    );
  }
}
