import { ProfileComponent } from "@/components/ProfileComponent"
import { redirect } from "next/navigation"
import { getServerAuthSession } from "@/app/lib/auth"

export default async function Page() {
  const session = await getServerAuthSession()

  // If there's no session or user, redirect to sign-in
  if (!session || !session.user) {
    redirect("/auth/signin")
  }

  // Pass only the session.user object to the component
  return <ProfileComponent user={session.user} />
}
