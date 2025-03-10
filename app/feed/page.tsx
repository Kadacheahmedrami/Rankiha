import AppLayout from "@/components/app-layout";
import CommentFeed from "@/components/CommentFeed";
import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/app/lib/auth";
import { BLACKLISTED_EMAILS } from "@/app/BLACKLIST/blacklist"


export default async function CommentFeedPage() {
  const session = await getServerAuthSession();

  if (session?.user?.email && BLACKLISTED_EMAILS.includes(session.user.email)) {
    redirect("/ban");
  }
  
  if (!session?.user?.email) {
    redirect("/auth/signin");
  }

  return (
    <AppLayout>
      <CommentFeed />
    </AppLayout>
  );
}
