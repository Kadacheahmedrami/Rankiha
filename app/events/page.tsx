import AppLayout from "@/components/app-layout";
import EventsList from "@/components/events/events-list";
import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/app/lib/auth";
import { BLACKLISTED_EMAILS } from "@/app/BLACKLIST/blacklist";
import type { Event } from "@/lib/events";
import { headers } from "next/headers";

async function fetchEvents(): Promise<Event[]> {
  // Provide a base URL for the absolute URL.
  // Ensure NEXT_PUBLIC_BASE_URL is set in your .env file, e.g. NEXT_PUBLIC_BASE_URL=http://localhost:3000
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const url = new URL("/api/events", baseUrl);

  // Forward the incoming cookies so that the API endpoint can get the session
  const reqHeaders = headers();
  const cookie = reqHeaders.get("cookie") || "";
  
  const res = await fetch(url.toString(), {
    cache: "no-store",
    headers: { cookie },
  });
  
  if (!res.ok) {
    throw new Error("Failed to fetch events");
  }
  const json = await res.json();
  return json.data;
}

export default async function EventsPage() {
  const session = await getServerAuthSession();

  // Authentication checks
  if (session?.user?.email && BLACKLISTED_EMAILS.includes(session.user.email)) {
    redirect("/ban");
  }
  if (!session?.user?.email) {
    redirect("/auth/signin");
  }

  const events = await fetchEvents();

  return (
    <AppLayout>
      <div className="container py-6 md:py-10">
        <h1 className="text-3xl font-bold tracking-tight mb-6">Events</h1>
        <EventsList initialEvents={events} />
      </div>
    </AppLayout>
  );
}
