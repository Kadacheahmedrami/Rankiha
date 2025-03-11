import AppLayout from "@/components/app-layout";
import EventsList from "@/components/events/events-list";
import { redirect } from "next/navigation";
import { getServerAuthSession } from "@/app/lib/auth";
import { BLACKLISTED_EMAILS } from "@/app/BLACKLIST/blacklist";
import type { Event } from "@/lib/events";

async function fetchEvents(): Promise<Event[]> {
  // In a real app, this would be an API call to your backend
  // For now, we'll return mock data

  return [];
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
