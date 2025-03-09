"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { TrendingUp, Search } from "lucide-react"
import Link from "next/link"
import RatingStars from "@/components/rating-stars"
import { useEffect, useState, useRef } from "react"
import Pusher from "pusher-js"
import { useSession } from "next-auth/react"
import { toast } from "react-hot-toast"  // Importing toast from react-hot-toast

// Extended Profile interface to include 'rank'
interface Profile {
  id: string
  name: string
  username: string
  rating: number
  ratings: number | null
  change: "up" | "down" | "same"
  image: string
  rank: number
}

export default function Leaderboard() {
  const [searchTerm, setSearchTerm] = useState<string>("")
  const [isSearchFocused, setIsSearchFocused] = useState<boolean>(false)
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [page, setPage] = useState<number>(1)
  const [limit] = useState<number>(20)
  const [totalPages, setTotalPages] = useState<number>(1)
  const [isFetchingMore, setIsFetchingMore] = useState<boolean>(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const { data: session } = useSession()

  // Fetch leaderboard data with pagination metadata
  const fetchLeaderboard = async (): Promise<void> => {
    try {
      const queryParams = new URLSearchParams()
      if (searchTerm) queryParams.append("search", searchTerm)
      queryParams.append("page", page.toString())
      queryParams.append("limit", limit.toString())
      const query = "?" + queryParams.toString()
      const res = await fetch(`/api/leaderboard${query}`)
      if (!res.ok) {
        console.error("Error fetching leaderboard:", res.statusText)
        return
      }
      const json = await res.json()
      // If we're on page 1, replace the leaderboard; otherwise, append new results.
      if (page === 1) {
        setProfiles(json.data)
      } else {
        setProfiles((prev) => [...prev, ...json.data])
      }
      setTotalPages(json.pagination.totalPages)
      setIsFetchingMore(false)
    } catch (error) {
      console.error("Error fetching leaderboard:", error)
      setIsFetchingMore(false)
    }
  }

  // Handle rating submission using the POST upsert endpoint.
  const handleRatingChange = async (profile: Profile, newRating: number): Promise<void> => {
    // Check if the user is trying to rate themselves
    if (session?.user?.id === profile.id) {
      console.log("Attempt to rate self detected")
      toast.error("You cannot rate yourself")
      return
    }

    try {
      console.log("Submitting rating for profile:", profile)
      const response: Response = await fetch("/api/rating", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ratedUserId: profile.id, value: newRating }),
      })
      if (!response.ok) {
        const errorData = await response.json()
        console.error("Error rating profile:", errorData.error || response.statusText)
        return
      }
      const data = await response.json()
      console.log("Rating submitted successfully:", data)
      // Refresh the leaderboard after the rating update
      await fetchLeaderboard()
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error("Error submitting rating:", error.message)
      } else {
        console.error("An unexpected error occurred while submitting the rating.")
      }
    }
  }

  // Debounced fetch when searchTerm changes; reset page to 1 on search change.
  useEffect(() => {
    setPage(1)
    const delayDebounceFn = setTimeout(() => {
      fetchLeaderboard()
    }, 300)
    return () => clearTimeout(delayDebounceFn)
  }, [searchTerm])

  // Re-fetch when page changes
  useEffect(() => {
    fetchLeaderboard()
  }, [page])

  // Infinite scroll: load next page when near bottom if available.
  useEffect(() => {
    const handleScroll = () => {
      if (isFetchingMore) return
      if (
        window.innerHeight + window.scrollY >= document.body.offsetHeight - 100 &&
        page < totalPages
      ) {
        setIsFetchingMore(true)
        setPage((prev) => prev + 1)
      }
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [isFetchingMore, page, totalPages])

  // Subscribe to Pusher for real-time updates.
  useEffect(() => {
    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    })
    const channel = pusher.subscribe("leaderboard")
    channel.bind("rating-updated", (updateData: { rating: number; profileId: string; rank?: number }) => {
      console.log("Rating update received:", updateData)
      // Optionally, reset to page 1 on update:
      setPage(1)
      fetchLeaderboard()
    })
    return () => {
      channel.unbind_all()
      channel.unsubscribe()
    }
  }, [])

  // Optional: Focus the search input after a short delay on mount.
  useEffect(() => {
    const timer = setTimeout(() => {
      searchInputRef.current?.focus()
    }, 500)
    return () => clearTimeout(timer)
  }, [])

  // Get current user's profile from the fetched leaderboard data.
  const currentUserProfile = session?.user?.id ? profiles.find((p) => p.id === session.user!.id) : null

  return (
    <div className="flex flex-col gap-2 px-2 sm:px-0">
      <div className="flex flex-col gap-3 mb-4">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight glow-text bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-500">
          Leaderboard
        </h1>
      </div>

      {/* Prominent Search Bar */}
      <div>
        <div className={`relative w-full transition-all duration-300 ${isSearchFocused ? "scale-102" : ""}`}>
          <div className="absolute inset-0 -m-1 bg-gradient-to-r from-primary/50 to-purple-500/50 rounded-2xl blur-md opacity-70 animate-pulse-glow"></div>
          <div className="relative bg-secondary/30 backdrop-blur-sm rounded-xl border border-primary/30 shadow-xl overflow-hidden">
            <div className="absolute inset-y-0 left-3 sm:left-5 flex items-center pointer-events-none">
              <Search
                className={`h-5 w-5 sm:h-6 sm:w-6 transition-colors duration-300 ${
                  isSearchFocused ? "text-primary" : "text-primary/70"
                }`}
              />
            </div>
            <Input
              ref={searchInputRef}
              placeholder="Search profiles by name or username..."
              className="pl-10 sm:pl-14 pr-4 sm:pr-36 h-[60px] sm:py-7 text-base sm:text-lg border-0 placeholder:text-foreground/50 focus-visible:ring-0 focus-visible:ring-offset-0"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
            />
            <div className="absolute inset-y-0 right-3 flex items-center gap-2">
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 sm:h-9 rounded-lg bg-background/20 hover:bg-background/40 text-foreground hidden sm:flex"
                  onClick={() => setSearchTerm("")}
                >
                  Clear
                </Button>
              )}
              <div className="h-8 sm:h-10 p-2 py-2 md:py-6 font-bold text-[32px] rounded-lg bg-primary flex items-center gap-1 sm:gap-2 shadow-md">
                <div>#{currentUserProfile ? currentUserProfile.rank : "N/A"}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Leaderboard List */}
      <Card className="overflow-hidden border-0 shadow-xl bg-gradient-to-b from-background to-secondary/10">
        <CardHeader className="pb-0 border-b border-border/20">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
            <div>
              <CardTitle className="text-xl sm:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-500">
                All Profiles
              </CardTitle>
              <CardDescription className="text-sm sm:text-base">
                {profiles.length} profiles found {searchTerm && `for "${searchTerm}"`}
              </CardDescription>
            </div>
            {searchTerm && profiles.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchTerm("")}
                className="text-muted-foreground hover:text-foreground self-start sm:self-auto"
              >
                Clear search
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className={`transition-opacity duration-300 ${profiles.length ? "opacity-100" : "opacity-0"}`}>
            {profiles.length > 0 ? (
              profiles.map((profile) => (
                <div
                  key={profile.id}
                  className={`flex items-center gap-4 p-5 border-b border-border/20 hover:bg-secondary/20 transition-all duration-300 animate-slide-up ${
                    profile.rank <= 3 ? "bg-gradient-to-r from-primary/5 to-transparent" : ""
                  }`}
                >
                  <div className="w-8 text-center font-bold text-lg">
                    <Link href={`/profile/${profile.id}`} className="hover:underline">
                      {profile.rank}
                    </Link>
                  </div>

                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center shadow-md ${
                      profile.rank === 1
                        ? "bg-gradient-to-r from-yellow-500/30 to-yellow-600/30 ring-2 ring-yellow-500/30"
                        : profile.rank === 2
                        ? "bg-gradient-to-r from-gray-400/30 to-gray-500/30 ring-2 ring-gray-400/30"
                        : profile.rank === 3
                        ? "bg-gradient-to-r from-amber-600/30 to-amber-700/30 ring-2 ring-amber-600/30"
                        : "bg-gradient-to-r from-primary/20 to-purple-500/20"
                    }`}
                  >
                    <span className="font-bold text-lg">{profile.name.charAt(0)}</span>
                  </div>

                  <div className="flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div>
                        <h4 className="font-medium text-lg">{profile.name}</h4>
                        <p className="text-sm text-muted-foreground">{profile.username}</p>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mt-2 sm:mt-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold">{profile.rating.toFixed(1)}</span>
                          <RatingStars
                            initialRating={profile.rating}
                            displayOnly={false}
                            size="sm"
                            profileId={profile.id}
                            disableSelfRating={session?.user?.id === profile.id}
                            onRate={(newRating: number) => handleRatingChange(profile, newRating)}
                          />
                          <span className="text-xs text-muted-foreground">({profile.ratings})</span>
                        </div>

                        <div className="hidden sm:flex items-center">
                          {profile.change === "up" && <span className="text-green-500 text-sm font-bold">↑</span>}
                          {profile.change === "down" && <span className="text-red-500 text-sm font-bold">↓</span>}
                          {profile.change === "same" && <span className="text-muted-foreground text-sm">-</span>}
                        </div>

                        <Link href={`/profile/${profile.id}`} className="sm:ml-auto">
                          <Button variant="ghost" size="sm" className="glow-effect bg-white bg-opacity-10 rounded-full px-4 w-full sm:w-auto">
                            View
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-12 text-center">
                <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <h3 className="text-xl font-medium mb-2">No profiles found</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  We couldn't find any profiles matching "{searchTerm}". Try a different search term or browse all profiles.
                </p>
                <Button variant="outline" className="mt-4 glow-effect" onClick={() => setSearchTerm("")}>
                  Show all profiles
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
