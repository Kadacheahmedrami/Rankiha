import { type NextRequest, NextResponse } from "next/server";
import { getServerAuthSession } from "@/app/lib/auth";
import { BLACKLISTED_EMAILS } from "@/app/BLACKLIST/blacklist";
import { prisma } from "@/prisma/prismaClient";

interface PostBody {
  imgUrl: string;
  title: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as PostBody;
    if (!body.imgUrl) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (!body.title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const session = await getServerAuthSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.email && BLACKLISTED_EMAILS.includes(session.user.email)) {
      return NextResponse.json(
        { error: "You are banned, little guy" },
        { status: 403 }
      );
    }
    const user = await prisma.user.findUnique({
      where: {
        id: session.user.id,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "The id is invalid!" },
        { status: 403 }
      );
    }

    const post = await prisma.post.create({
      data: {
        title: body.title,
        imageUrl: body.imgUrl,
        authorId: session.user.id,
      },
    });

    return NextResponse.json(post, { status: 201 });
  } catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}
