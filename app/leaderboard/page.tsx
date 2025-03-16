import AppLayout from "@/components/app-layout";
import Leaderboard from "@/components/Leaderboard";
import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/lib/auth";
import { BLACKLISTED_EMAILS } from "@/app/BLACKLIST/blacklist"
import ActiveEvent from "@/components/slect-active-event"

export default async function LeaderboardPage() {
  const session = await getServerAuthSession();

  if (session?.user?.email && BLACKLISTED_EMAILS.includes(session.user.email)) {
    redirect("/ban");
  }
  if (!session?.user?.email) {
    redirect("/auth/signin");
  }



  return (
    <AppLayout>
      <ActiveEvent></ActiveEvent>
      <Leaderboard />
    </AppLayout>
  );
}
