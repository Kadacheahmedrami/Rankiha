import AppLayout from "@/components/app-layout";
import Leaderboard from "@/components/Leaderboard";
import { redirect } from "next/navigation"
import { getServerAuthSession } from "@/app/lib/auth"


export default async function LeaderboardPage() {

  const session = await getServerAuthSession()

  if (!session || !session.user) {
    redirect("/auth/signin")
  }


  return (
    <AppLayout>
      <Leaderboard />
    </AppLayout>
  );
}
