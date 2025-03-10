import { ProfileComponent } from "@/components/ProfileComponent";
import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/app/lib/auth";
import { BLACKLISTED_EMAILS } from "@/app/BLACKLIST/blacklist";

export default async function Page({ params }: { params: { id: string } }) {
  const session = await getServerAuthSession();

  // If the session exists and the user's email is blacklisted, redirect to /ban.
  if (session?.user?.email && BLACKLISTED_EMAILS.includes(session.user.email)) {
    redirect("/ban");
  }
  // If there's no session or no user email, redirect to sign-in.
  if (!session?.user?.email) {
    redirect("/auth/signin");
  }

  return <ProfileComponent id={params.id} />;
}
