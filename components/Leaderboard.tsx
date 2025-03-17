"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { MessageSquare, Search } from "lucide-react"
import Link from "next/link"
import RatingStars from "@/components/rating-stars"
import { useEffect, useState, useRef } from "react"
import { useSession } from "next-auth/react"
import { toast } from "react-hot-toast"
import CommentModal from "@/components/comment-modal"
import { decrypt } from "@/lib/encryption"

// Extended Profile interface (after decryption) for leaderboard items.
interface Profile {
  id: string
  name: string
  username: string
  rating: number
  ratings: number | null
  change: "up" | "down" | "same"
  image: string
  tag: string
  rank: number
}

export default function Leaderboard() {
  const [searchTerm, setSearchTerm] = useState<string>("")
  const [isSearchFocused, setIsSearchFocused] = useState<boolean>(false)
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [currentUserRank, setCurrentUserRank] = useState<string | null>(null)
  const [page, setPage] = useState<number>(1)
  const [limit] = useState<number>(20)
  const [totalPages, setTotalPages] = useState<number>(1)
  const [isFetchingMore, setIsFetchingMore] = useState<boolean>(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const { data: session } = useSession()

  // Comment modal state
  const [isCommentModalOpen, setIsCommentModalOpen] = useState<boolean>(false)
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null)

  // Filter states
  const [timeFilter, setTimeFilter] = useState<"today" | "all-time">("today")
  const [schoolFilter, setSchoolFilter] = useState<string | null>(null)
  const schoolOptions = ["ESTIN", "ESI", "ESISBA", "Polytechnique"]

  // Helper: Return vibrant classes based on tag.
  const getTagStyles = (tag?: string): string => {
    const upperTag = (tag || "").toUpperCase()
    switch (upperTag) {
      case "ADMIN":
        return "bg-gradient-to-r from-primary to-purple-500 text-white px-2 py-0.5 text-xs rounded-full shadow-lg transform hover:scale-105 transition duration-300"
      case "PROFESSOR":
        return "bg-gradient-to-r from-primary/80 to-secondary/80 text-white px-2 py-0.5 text-xs rounded-full shadow-lg transform hover:rotate-3 transition duration-300"
      case "NOURI":
        return "bg-gradient-to-r from-primary to-purple-500 text-white px-2 py-0.5 text-xs rounded-full shadow-lg transform hover:scale-105 transition duration-300"
      case "HACKER":
        return "bg-red-500 text-white px-2 py-0.5 text-xs rounded-full border-2 border-dashed border-yellow-300 font-extrabold animate-pulse"
      case "USER":
        return "hidden text-transparent"
      default:
        return "bg-secondary/20 text-primary px-2 py-0.5 text-xs rounded-full"
    }
  }

  // Helper: Decrypt an encrypted profile object.
  const decryptProfile = (encryptedProfile: any): Profile => ({
    id: encryptedProfile.id, // Hashed ID remains as is.
    name: decrypt(encryptedProfile.name),
    username: decrypt(encryptedProfile.username),
    tag: decrypt(encryptedProfile.tag),
    rating: Number.parseFloat(decrypt(encryptedProfile.rating)),
    ratings: Number.parseInt(decrypt(encryptedProfile.ratingsCount)),
    rank: Number.parseInt(decrypt(encryptedProfile.rank)),
    change: encryptedProfile.change,
    image: encryptedProfile.image || "",
  })

  // Fetch leaderboard data, decrypt it, and update state.
  const fetchLeaderboard = async (): Promise<void> => {
    try {
      const queryParams = new URLSearchParams()
      if (searchTerm) queryParams.append("search", searchTerm)
      queryParams.append("page", page.toString())
      queryParams.append("limit", limit.toString())
      // Map client filter values to API expected values.
      const timeRangeParam = timeFilter === "today" ? "Today" : "All Time"
      queryParams.append("timeRange", timeRangeParam)
      if (schoolFilter) queryParams.append("school", schoolFilter)
      const query = "?" + queryParams.toString()
      const res = await fetch(`/api/leaderboard${query}`)
      if (!res.ok) return

      const json = await res.json()
      // Decrypt each leaderboard profile.
      const decryptedProfiles = json.data.map((profile: any) => decryptProfile(profile))

      if (page === 1) {
        setProfiles(decryptedProfiles)
      } else {
        setProfiles((prev) => [...prev, ...decryptedProfiles])
      }
      setTotalPages(json.pagination.totalPages)

      // Decrypt and set the current user's rank.
      if (json.currentUserRank) {
        setCurrentUserRank(decrypt(json.currentUserRank))
      } else {
        setCurrentUserRank(null)
      }
      setIsFetchingMore(false)
    } catch (error) {
      setIsFetchingMore(false)
      console.error("Error fetching leaderboard:", error)
    }
  }

  // Handle rating change submissions.
  const handleRatingChange = async (profile: Profile, newRating: number): Promise<void> => {
    if (session?.user?.id === decrypt(profile.id)) {
      toast.error("You cannot rate yourself")
      return
    }
    try {
      const response: Response = await fetch("/api/rating", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ratedUserId: decrypt(profile.id), value: newRating }),
      })
      if (!response.ok) {
        const errorData = await response.json()
        console.error("Error rating profile:", errorData.error || response.statusText)
        return
      }
      await response.json()
      await fetchLeaderboard()
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error("Error submitting rating:", error.message)
      } else {
        console.error("An unexpected error occurred while submitting the rating.")
      }
    }
  }

  // Open comment modal.
  const handleOpenCommentModal = (profile: Profile) => {
    if (session?.user?.id === decrypt(profile.id)) {
      toast.error("You cannot comment on your own profile")
      return
    }
    if (!session?.user) {
      toast.error("Please sign in to leave a comment")
      return
    }
    setSelectedProfile(profile)
    setIsCommentModalOpen(true)
  }

  // Handle comment submission.
  const handleCommentSubmit = async (comment: string): Promise<boolean> => {
    if (!selectedProfile) return false
    const trimmedComment = comment.trim()
    if (trimmedComment.length === 0) {
      toast.error("Comment cannot be empty. Please enter a comment.")
      return false
    }
    if (trimmedComment.length < 3) {
      toast.error("Comment is too short. Please enter at least 3 characters.")
      return false
    }
    if (trimmedComment.length > 500) {
      toast.error("Comment is too long. Please limit your comment to 500 characters.")
      return false
    }
    try {
      const response = await fetch("/api/comment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUserId: selectedProfile.id,
          content: trimmedComment,
        }),
      })
      if (!response.ok) {
        const errorData = await response.json()
        toast.error(errorData.error || "Failed to post comment")
        return false
      }
      toast.success("Comment posted successfully")
      return true
    } catch (error) {
      toast.error("Failed to post comment")
      return false
    }
  }

  // Debounce search term changes and re-fetch leaderboard.
  useEffect(() => {
    setPage(1)
    const delayDebounceFn = setTimeout(() => {
      fetchLeaderboard()
    }, 300)
    return () => clearTimeout(delayDebounceFn)
  }, [searchTerm, timeFilter, schoolFilter])

  // Re-fetch leaderboard when page changes.
  useEffect(() => {
    fetchLeaderboard()
  }, [page])

  // Infinite scroll: load next page when near bottom.
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

  // Focus the search input on mount.
  useEffect(() => {
    const timer = setTimeout(() => {
      searchInputRef.current?.focus()
    }, 500)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="flex flex-col gap-2 px-2 ">
      {/* Prominent Search Bar */}
      <div>
        <div className={`relative w-full transition-all duration-300 ${isSearchFocused ? "scale-102" : ""}`}>
          <div className="absolute inset-0 -m-1 bg-gradient-to-r from-primary to-purple-500/50 rounded-2xl blur-md opacity-70 animate-pulse-glow"></div>
          <div className="relative bg-secondary/30 backdrop-blur-sm rounded-xl border border-primary/30 shadow-xl overflow-hidden">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <Search
                className={`h-5 w-5 transition-colors duration-300 ${isSearchFocused ? "text-primary" : "text-primary/70"}`}
              />
            </div>
            <Input
              ref={searchInputRef}
              placeholder="Search profiles..."
              className="pl-10 pr-16 h-12 text-sm border-0 placeholder:text-foreground/50 focus-visible:ring-0 focus-visible:ring-offset-0 sm:h-14 sm:text-base sm:pl-14 sm:pr-36"
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
                  className="h-8 rounded-lg bg-background/20 hover:bg-background/40 text-foreground hidden sm:flex"
                  onClick={() => setSearchTerm("")}
                >
                  Clear
                </Button>
              )}
              <div className="h-8 p-1 font-bold text-lg rounded-lg bg-primary flex items-center justify-center shadow-md sm:h-10 sm:p-2 sm:text-2xl">
                <div>#{currentUserRank ? currentUserRank : "N/A"}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mt-4 mb-4 bg-secondary/10 rounded-xl p-3 border border-primary/10 shadow-sm">
        <div className="flex flex-row items-center flex-wrap gap-4">
          {/* Filter Label */}
          <h3 className="text-sm font-medium text-muted-foreground">Filters:</h3>

          {/* Time Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium whitespace-nowrap">Time Range:</span>
            <div className="flex rounded-lg overflow-hidden border border-primary/30 shadow-sm">
              <Button
                variant={timeFilter === "today" ? "default" : "ghost"}
                size="sm"
                className={`rounded-none h-8 px-3 ${timeFilter === "today" ? "bg-primary text-primary-foreground" : "bg-secondary/30 text-foreground"}`}
                onClick={() => {
                  setTimeFilter("today")
                  setPage(1)
                }}
              >
                Today
              </Button>
              <Button
                variant={timeFilter === "all-time" ? "default" : "ghost"}
                size="sm"
                className={`rounded-none h-8 px-3 ${timeFilter === "all-time" ? "bg-primary text-primary-foreground" : "bg-secondary/30 text-foreground"}`}
                onClick={() => {
                  setTimeFilter("all-time")
                  setPage(1)
                }}
              >
                All Time
              </Button>
            </div>
          </div>

          {/* School Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium whitespace-nowrap">School:</span>
            <div className="flex flex-wrap gap-1">
              <Button
                variant={schoolFilter === null ? "default" : "ghost"}
                size="sm"
                className={`h-8 px-3 ${schoolFilter === null ? "bg-primary text-primary-foreground" : "bg-secondary/30 text-foreground"}`}
                onClick={() => {
                  setSchoolFilter(null)
                  setPage(1)
                }}
              >
                All
              </Button>
              {schoolOptions.map((school) => (
                <Button
                  key={school}
                  variant={schoolFilter === school ? "default" : "ghost"}
                  size="sm"
                  className={`h-8 px-3 ${schoolFilter === school ? "bg-primary text-primary-foreground" : "bg-secondary/30 text-foreground"}`}
                  onClick={() => {
                    setSchoolFilter(school)
                    setPage(1)
                  }}
                >
                  {school}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Leaderboard List */}
      <Card className="overflow-hidden border-0 shadow-xl bg-gradient-to-b from-background to-secondary/10">
        <CardHeader className="pb-0 border-b border-border/20 px-4 py-4 sm:px-6 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
            <div>
              <CardTitle className="text-lg sm:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-500">
                All Profiles
              </CardTitle>
              <CardDescription className="text-xs sm:text-base">
                {profiles.length} profiles found {searchTerm && `for "${searchTerm}"`}
              </CardDescription>
            </div>
            {searchTerm && profiles.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchTerm("")}
                className="text-muted-foreground hover:text-foreground self-start sm:self-auto text-xs"
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
                  key={decrypt(profile.id)}
                  className={`flex flex-col sm:flex-row sm:items-center gap-3 p-4 border-b border-border/20 hover:bg-secondary/20 transition-all duration-300 animate-slide-up ${
                    profile.rank <= 3 ? "bg-gradient-to-r from-primary/5 to-transparent" : ""
                  }`}
                >
                  {/* Mobile layout: Top row with rank, avatar, name, and tag */}
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="flex items-center gap-3">
                      <div className="w-6 text-center font-bold text-base sm:w-8 sm:text-lg">
                        <Link href={`/profile/${decrypt(profile.id)}`} className="hover:underline">
                          {profile.rank}
                        </Link>
                      </div>
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center shadow-md sm:w-12 sm:h-12 ${
                          profile.rank === 1
                            ? "bg-gradient-to-r from-yellow-500/30 to-yellow-600/30 ring-2 ring-yellow-500/30"
                            : profile.rank === 2
                              ? "bg-gradient-to-r from-gray-400/30 to-gray-500/30 ring-2 ring-gray-400/30"
                              : profile.rank === 3
                                ? "bg-gradient-to-r from-amber-600/30 to-amber-700/30 ring-2 ring-amber-600/30"
                                : "bg-gradient-to-r from-primary/20 to-purple-500/20"
                        }`}
                      >
                        <span className="font-bold text-base sm:text-lg">{profile.name.charAt(0)}</span>
                      </div>
                    </div>
                    <div className="flex flex-col">
                      <h4 className="font-medium text-base sm:text-lg">{profile.name}</h4>
                      <div className="flex flex-wrap items-center gap-1">
                        <p>
                          <span className="text-xs text-muted-foreground sm:text-sm">{profile.username}</span>
                          <span className={getTagStyles(profile.tag) + " hidden md:inline mx-2"}>{profile.tag}</span>
                        </p>
                      </div>
                    </div>
                    <span className={getTagStyles(profile.tag) + " inline md:hidden ml-auto mb-auto"}>
                      {profile.tag}
                    </span>
                  </div>

                  {/* Mobile layout: Bottom row with rating and buttons */}
                  <div className="flex items-center justify-end flex-wrap gap-4 md:flex-row mt-2 w-full sm:mt-0 sm:ml-auto sm:w-auto sm:justify-end">
                    <div className="flex items-center mr-auto gap-2">
                      <span className="font-bold text-sm">{profile.rating.toFixed(2)}</span>
                      <RatingStars
                        initialRating={profile.rating}
                        displayOnly={false}
                        size="sm"
                        profileId={decrypt(profile.id)}
                        disableSelfRating={session?.user?.id === decrypt(profile.id)}
                        onRate={(newRating: number) => handleRatingChange(profile, newRating)}
                      />
                      <span className="text-xs w-4 mx-1 text-muted-foreground">({profile.ratings})</span>
                      <div className="flex items-center mx-2">
                        {profile.change === "up" && <span className="text-green-500 text-sm font-bold">↑</span>}
                        {profile.change === "down" && <span className="text-red-500 text-sm font-bold">↓</span>}
                        {profile.change === "same" && <span className="text-muted-foreground text-sm">-</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1 rounded-full bg-secondary/40 hover:bg-secondary/60 border-primary/20 hover:border-primary/40 text-xs px-2 h-8 transition-all duration-200 hover:scale-105 group"
                        onClick={() => handleOpenCommentModal(profile)}
                      >
                        <MessageSquare className="h-3 w-3 text-primary group-hover:text-primary/80" />
                      </Button>
                      <Link href={`/profile/${decrypt(profile.id)}`}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="glow-effect bg-white bg-opacity-10 rounded-full px-3 text-xs h-8"
                        >
                          View
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 text-center sm:p-12">
                <Search className="h-8 w-8 text-muted-foreground mx-auto mb-3 opacity-50 sm:h-12 sm:w-12 sm:mb-4" />
                <h3 className="text-lg font-medium mb-2 sm:text-xl">No profiles found</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto sm:text-base">
                  We couldn't find any profiles matching "{searchTerm}". Try a different search term or browse all
                  profiles.
                </p>
                <Button
                  variant="outline"
                  className="mt-3 glow-effect text-sm sm:mt-4"
                  onClick={() => setSearchTerm("")}
                >
                  Show all profiles
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Loading indicator for infinite scroll */}
      {isFetchingMore && page < totalPages && (
        <div className="py-4 text-center">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
          <p className="text-sm text-muted-foreground mt-2">Loading more profiles...</p>
        </div>
      )}

      {/* Comment Modal */}
      {selectedProfile && (
        <CommentModal
          isOpen={isCommentModalOpen}
          onClose={() => setIsCommentModalOpen(false)}
          profile={selectedProfile}
          onSubmit={handleCommentSubmit}
        />
      )}
    </div>
  )
}
