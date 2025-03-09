import { ProfileComponent } from "@/components/ProfileComponent";
import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/app/lib/auth";
import { BLACKLISTED_EMAILS } from "@/app/BLACKLIST/blacklist"; // Import blacklist

export default async function Page({ params }: { params: { id: string } }) {
  const session = await getServerAuthSession();

  // If there's no session, user, or the user is blacklisted, redirect to sign-in
  if (!session?.user?.email || BLACKLISTED_EMAILS.includes(session.user.email)) {
    redirect("/auth/signin");
  }

  console.log(params.id);
  
  // Pass the URL id to the ProfileComponent 
  return <ProfileComponent id={params.id} />;
}
