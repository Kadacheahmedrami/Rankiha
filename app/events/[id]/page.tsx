import { notFound, redirect } from "next/navigation"
import { headers } from "next/headers"
import { format } from "date-fns"
import { CalendarIcon, ArrowLeft, Trophy, Clock } from "lucide-react"
import AppLayout from "@/components/app-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getServerAuthSession } from "@/app/lib/auth"
import { BLACKLISTED_EMAILS } from "@/app/BLACKLIST/blacklist"
import Link from "next/link"
import { getEventStatus } from "@/lib/events"
import { cn } from "@/lib/utils"
import LeaderboardWithStars from "@/components/LeaderboardWithStars"
import { Progress } from "@/components/ui/progress"

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

        {/* Event Header Card */}
        <Card className="mb-6 overflow-hidden border-none shadow-md">
          <div className="bg-gradient-to-r from-primary/90 to-primary p-6 text-white">
            <Badge className={cn("text-sm px-2.5 py-0.5 mb-3 bg-white/20 hover:bg-white/30 backdrop-blur-sm")}>
              {dynamicStatus === "active" ? "Active" : dynamicStatus === "upcoming" ? "Upcoming" : "Completed"}
            </Badge>

            <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">{event.title}</h1>
            <p className="text-white/80 text-sm md:text-base mb-4">{event.description}</p>

            <div className="flex flex-wrap items-center gap-3 text-sm bg-white/10 p-2 rounded-lg backdrop-blur-sm inline-flex">
              <div className="flex items-center gap-1.5">
                <CalendarIcon className="h-4 w-4" />
                <span>
                  {format(new Date(event.startDate), "MMM d, yyyy")} - {format(new Date(event.endDate), "MMM d, yyyy")}
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* Mobile-first layout - Rankings appear above status on mobile */}
        <div className="md:hidden mb-6">
          <Card className="shadow-sm hover:shadow transition-shadow duration-200 overflow-hidden">
            <CardHeader className="p-4 pb-2 bg-gradient-to-r from-muted/50 to-background">
              <CardTitle className="text-xl flex items-center gap-2">
                <Trophy className="h-5 w-5 text-primary" />
                Current Rankings
              </CardTitle>
              <CardDescription>See how articles are currently ranked</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="p-4  overflow-y-auto scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent">
                <LeaderboardWithStars data={leaderboard.data} sessionUserId={session.user.id} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Status Card */}
        <Card className="mb-6  hidden md:block shadow-sm hover:shadow transition-shadow duration-200">
          <CardContent className="p-4 space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                <h3 className="font-medium">Event Status</h3>
              </div>
              <Badge
                variant="outline"
                className={cn(
                  "capitalize font-medium",
                  dynamicStatus === "active" && "border-green-500 text-green-600",
                  dynamicStatus === "upcoming" && "border-blue-500 text-blue-600",
                  dynamicStatus === "completed" && "border-gray-500 text-gray-600",
                )}
              >
                {dynamicStatus}
              </Badge>
            </div>

            {dynamicStatus !== "completed" && (
              <div className="flex justify-between items-center p-2 bg-muted/50 rounded-md">
                <span className="text-sm text-muted-foreground">
                  {dynamicStatus === "upcoming" ? "Days Until Start" : "Days Remaining"}
                </span>
                <span className="font-medium text-lg">
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
                <Progress value={progressPercentage} className="h-3 rounded-full" />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Desktop Rankings - Hidden on mobile */}
        <div className="hidden md:block">
          <Card className="shadow-sm hover:shadow transition-shadow duration-200 overflow-hidden">
            <CardHeader className="p-4 pb-2 bg-gradient-to-r from-muted/50 to-background">
              <CardTitle className="text-xl flex items-center gap-2">
                <Trophy className="h-5 w-5 text-primary" />
                Current Rankings
              </CardTitle>
              <CardDescription>See how articles are currently ranked</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="p-4  overflow-y-auto scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent">
                <LeaderboardWithStars data={leaderboard.data} sessionUserId={session.user.id} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  )
}

