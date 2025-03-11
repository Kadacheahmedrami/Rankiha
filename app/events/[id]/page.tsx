import { notFound, redirect } from "next/navigation"
import { headers } from "next/headers"
import { format } from "date-fns"
import { CalendarIcon, ArrowLeft, Trophy, Info } from "lucide-react"
import AppLayout from "@/components/app-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getServerAuthSession } from "@/app/lib/auth"
import { BLACKLISTED_EMAILS } from "@/app/BLACKLIST/blacklist"
import Link from "next/link"
import { getEventStatus } from "@/lib/events"
import { cn } from "@/lib/utils"
import LeaderboardWithStars from "@/components/LeaderboardWithStars"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"

// --- Type Definitions ---
type Event = {
  id: string
  title: string
  description: string
  startDate: string
  endDate: string
}

type ArticleLeaderboardItem = {
  id: string
  name: string
  description: string
  rating: number
  ratingsCount: number
  rank: number
  change: "up" | "down" | "same"
}

type LeaderboardData = {
  data: ArticleLeaderboardItem[]
  pagination: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

type CombinedResponse = {
  event: Event
  leaderboard: LeaderboardData
}

// --- Data Fetching ---
async function fetchCombinedData(id: string): Promise<CombinedResponse> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
  const url = new URL(`/api/events/${id}`, baseUrl)
  // Retrieve the cookie from the request headers
  const cookie = headers().get("cookie") ?? ""
  const res = await fetch(url.toString(), {
    cache: "no-store",
    headers: { cookie },
  })
  if (!res.ok) {
    throw new Error("Failed to fetch event data")
  }
  return res.json()
}

// Replace the entire component with this simplified, mobile-responsive version
export default async function EventDetailsPage({
  params,
}: {
  params: { id: string }
}) {
  // --- Authentication ---
  const session = await getServerAuthSession()
  if (!session?.user?.email) {
    redirect("/auth/signin")
  }
  if (BLACKLISTED_EMAILS.includes(session.user.email)) {
    redirect("/ban")
  }

  // --- Fetch Combined Data (Event details + Leaderboard) ---
  let combinedData: CombinedResponse
  try {
    combinedData = await fetchCombinedData(params.id)
  } catch (error) {
    notFound()
  }
  const { event, leaderboard } = combinedData
  if (!event) {
    notFound()
  }

  // --- Compute Dynamic Event Status ---
  const dynamicStatus = getEventStatus(event.startDate, event.endDate)
  const daysRemaining = Math.max(
    0,
    Math.ceil((new Date(event.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)),
  )

  // Calculate progress percentage for active events
  const totalDuration = new Date(event.endDate).getTime() - new Date(event.startDate).getTime()
  const elapsed = new Date().getTime() - new Date(event.startDate).getTime()
  const progressPercentage =
    dynamicStatus === "active"
      ? Math.min(100, Math.max(0, Math.floor((elapsed / totalDuration) * 100)))
      : dynamicStatus === "completed"
        ? 100
        : 0

  // Get top 3 participants for highlight
  const topParticipants = leaderboard.data.slice(0, 3)

  // --- Render Page ---
  return (
    <AppLayout>
      <div className="container px-4 py-4 md:py-8 max-w-5xl mx-auto">
        {/* Back Button */}
        <div className="mb-4">
          <Link href="/events">
            <Button variant="ghost" size="sm" className="gap-1 pl-0 hover:pl-1 transition-all">
              <ArrowLeft className="h-4 w-4" /> Back to Events
            </Button>
          </Link>
        </div>

        {/* Event Header */}
        <div className="mb-6 space-y-3">
          <Badge
            className={cn(
              "text-sm px-2.5 py-0.5",
              dynamicStatus === "active" && "bg-green-500 hover:bg-green-600 text-white",
              dynamicStatus === "upcoming" && "bg-blue-500 hover:bg-blue-600 text-white",
              dynamicStatus === "completed" && "bg-gray-500 hover:bg-gray-600 text-white",
            )}
          >
            {dynamicStatus === "active" ? "Active" : dynamicStatus === "upcoming" ? "Upcoming" : "Completed"}
          </Badge>

          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{event.title}</h1>
          <p className="text-muted-foreground">{event.description}</p>

          <div className="flex flex-wrap items-center gap-3 text-sm">
            <div className="flex items-center gap-1.5">
              <CalendarIcon className="h-4 w-4 text-primary" />
              <span>
                {format(new Date(event.startDate), "MMM d, yyyy")} - {format(new Date(event.endDate), "MMM d, yyyy")}
              </span>
            </div>
          </div>
        </div>

        {/* Status Card */}
        <Card className="mb-6">
          <CardContent className="p-4 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-medium">Status</h3>
              <Badge variant="outline" className="capitalize">
                {dynamicStatus}
              </Badge>
            </div>

            {dynamicStatus !== "completed" && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  {dynamicStatus === "upcoming" ? "Days Until Start" : "Days Remaining"}
                </span>
                <span className="font-medium">
                  {dynamicStatus === "upcoming"
                    ? Math.ceil((new Date(event.startDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                    : daysRemaining}
                </span>
              </div>
            )}

            {dynamicStatus === "active" && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span>Progress</span>
                  <span>{progressPercentage}%</span>
                </div>
                <Progress value={progressPercentage} className="h-2" />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Leaderboard */}
        <Tabs defaultValue="rankings" className="w-full">
          <TabsList className="w-full grid grid-cols-2 mb-4">
            <TabsTrigger value="rankings">
              <Trophy className="mr-2 h-4 w-4 md:inline hidden" />
              Rankings
            </TabsTrigger>
            <TabsTrigger value="details">
              <Info className="mr-2 h-4 w-4 md:inline hidden" />
              Event Details
            </TabsTrigger>
          </TabsList>

          <TabsContent value="rankings">
            <Card>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-xl">Current Rankings</CardTitle>
                <CardDescription>See how items are currently ranked</CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                <LeaderboardWithStars data={leaderboard.data} sessionUserId={session.user.id} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="details">
            <Card>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-xl">Event Details</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div>
                  <h3 className="font-semibold mb-1">Description</h3>
                  <p className="text-muted-foreground text-sm">{event.description}</p>
                </div>

                <Separator />

                <div className="space-y-2">
                  <h3 className="font-semibold mb-1">Timeline</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span className="text-muted-foreground">Start Date</span>
                    <span className="text-right">{format(new Date(event.startDate), "MMMM d, yyyy")}</span>

                    <span className="text-muted-foreground">End Date</span>
                    <span className="text-right">{format(new Date(event.endDate), "MMMM d, yyyy")}</span>

                    <span className="text-muted-foreground">Duration</span>
                    <span className="text-right">
                      {Math.ceil(
                        (new Date(event.endDate).getTime() - new Date(event.startDate).getTime()) /
                          (1000 * 60 * 60 * 24),
                      )}{" "}
                      days
                    </span>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold mb-1">Top Performers</h3>
                  <div className="space-y-3 mt-2">
                    {topParticipants.length > 0 ? (
                      topParticipants.map((participant, index) => (
                        <div key={participant.id} className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-medium">
                            {index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate text-sm">{participant.name}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-sm">{participant.rating.toFixed(1)}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No participants yet</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  )
}

