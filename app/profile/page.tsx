import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/app/lib/auth";

export default async function ProfileRedirect() {
  const session = await getServerAuthSession();

  if (!session?.user?.id) {
    redirect("/auth/login"); // Handle case where session is null or user ID is missing
  }

  redirect(`/profile/${session.user.id}`);
}
