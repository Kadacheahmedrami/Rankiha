import { ProfileComponent } from "@/components/ProfileComponent";
import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/app/lib/auth";

export default async function Page({ params }: { params: { id: string } }) {
  const session = await getServerAuthSession();

  // If there's no session or user, redirect to sign-in
  if (!session || !session.user) {
    redirect("/auth/signin");
  }
  console.log(params.id);
  // Pass the URL id to the ProfileComponent 
  return <ProfileComponent id={params.id} />;
}
