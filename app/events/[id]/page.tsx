import { notFound } from "next/navigation";
import { format } from "date-fns";
import { CalendarIcon, ArrowLeft } from "lucide-react";
import AppLayout from "@/components/app-layout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getServerAuthSession } from "@/app/lib/auth";
import { BLACKLISTED_EMAILS } from "@/app/BLACKLIST/blacklist";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Event } from "@/lib/events";
import { getEventStatus } from "@/lib/events";
import { cn } from "@/lib/utils";

async function fetchEventDetails(id: string): Promise<Event | null> {
  // In a real app, this would be an API call to your backend
  // For now, we'll return mock data
  await new Promise((resolve) => setTimeout(resolve, 500)); // Simulate network delay

  return null;
}

export default async function EventDetailsPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerAuthSession();

  // Authentication checks
  if (session?.user?.email && BLACKLISTED_EMAILS.includes(session.user.email)) {
    redirect("/ban");
  }
  if (!session?.user?.email) {
    redirect("/auth/signin");
  }

  const event = await fetchEventDetails(params.id);

  if (!event) {
    notFound();
  }

  // Calculate dynamic status
  const dynamicStatus = getEventStatus(event.startDate, event.endDate);

  // Calculate days remaining
  const daysRemaining = Math.max(
    0,
    Math.ceil(
      (new Date(event.endDate).getTime() - new Date().getTime()) /
        (1000 * 60 * 60 * 24)
    )
  );

  return (
    <AppLayout>
      <div className="container py-6 md:py-10">
        <div className="mb-6">
          <Link href="/events">
            <Button variant="ghost" size="sm" className="gap-1">
              <ArrowLeft className="h-4 w-4" /> Back to Events
            </Button>
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-2xl md:text-3xl">
                    {event.title}
                  </CardTitle>
                  <Badge
                    className={cn(
                      dynamicStatus === "active" &&
                        "bg-green-500 hover:bg-green-600",
                      dynamicStatus === "upcoming" &&
                        "bg-blue-500 hover:bg-blue-600",
                      dynamicStatus === "completed" &&
                        "bg-gray-500 hover:bg-gray-600"
                    )}
                  >
                    {dynamicStatus === "active"
                      ? "Active"
                      : dynamicStatus === "upcoming"
                      ? "Upcoming"
                      : "Completed"}
                  </Badge>
                </div>
                <CardDescription className="text-base">
                  {event.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center text-sm">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    <span>
                      {format(new Date(event.startDate), "MMMM d, yyyy")} -{" "}
                      {format(new Date(event.endDate), "MMMM d, yyyy")}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Event Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status</span>
                    <span className="font-medium capitalize">
                      {dynamicStatus}
                    </span>
                  </div>
                  {dynamicStatus !== "completed" && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {dynamicStatus === "upcoming"
                          ? "Days Until Start"
                          : "Days Remaining"}
                      </span>
                      <span className="font-medium">
                        {dynamicStatus === "upcoming"
                          ? Math.ceil(
                              (new Date(event.startDate).getTime() -
                                new Date().getTime()) /
                                (1000 * 60 * 60 * 24)
                            )
                          : daysRemaining}
                      </span>
                    </div>
                  )}
                  {dynamicStatus === "completed" && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Event Ended</span>
                      <span className="font-medium">
                        {format(new Date(event.endDate), "MMMM d, yyyy")}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="mt-8">
          <Tabs defaultValue="rankings">
            <TabsList className="mb-4">
              <TabsTrigger value="rankings">Rankings</TabsTrigger>
            </TabsList>

            <TabsContent value="rankings">
              <Card>
                <CardHeader>
                  <CardTitle>Current Rankings</CardTitle>
                  <CardDescription>
                    See how items are currently ranked in this event
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[1, 2, 3, 4, 5].map((rank) => (
                      <div
                        key={rank}
                        className="flex items-center gap-4 p-3 rounded-lg border"
                      >
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold">
                          {rank}
                        </div>
                        <div className="flex-grow">
                          <h4 className="font-medium">Item {rank}</h4>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">
                            Score: {Math.round(100 - rank * 10)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AppLayout>
  );
}
