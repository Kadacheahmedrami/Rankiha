"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Star, TrendingUp, Search, Crown, Award, Medal } from "lucide-react"
import Link from "next/link"
import AppLayout from "@/components/app-layout"
import RatingStars from "@/components/rating-stars"
import { useEffect, useState, useRef } from "react"

export default function LeaderboardPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Mock data for all profiles
  const allProfiles = [
    { id: 1, name: "Alex Johnson", username: "@alexj", rating: 4.8, ratings: 124, change: "up" },
    { id: 2, name: "Samantha Lee", username: "@samlee", rating: 4.7, ratings: 98, change: "same" },
    { id: 3, name: "Marcus Chen", username: "@mchen", rating: 4.6, ratings: 76, change: "up" },
    { id: 4, name: "Jessica Wong", username: "@jwong", rating: 4.5, ratings: 112, change: "down" },
    { id: 5, name: "David Miller", username: "@dmiller", rating: 4.5, ratings: 89, change: "up" },
    { id: 6, name: "Emma Thompson", username: "@ethompson", rating: 4.4, ratings: 67, change: "up" },
    { id: 7, name: "Michael Scott", username: "@mscott", rating: 4.3, ratings: 145, change: "down" },
    { id: 8, name: "Sarah Johnson", username: "@sjohnson", rating: 4.3, ratings: 92, change: "same" },
    { id: 9, name: "Robert Chen", username: "@rchen", rating: 4.2, ratings: 78, change: "up" },
    { id: 10, name: "Lisa Park", username: "@lpark", rating: 4.1, ratings: 63, change: "down" },
    { id: 11, name: "Thomas Wilson", username: "@twilson", rating: 4.0, ratings: 55, change: "up" },
    { id: 12, name: "Amanda Garcia", username: "@agarcia", rating: 3.9, ratings: 48, change: "same" },
    { id: 13, name: "Kevin Brown", username: "@kbrown", rating: 3.8, ratings: 42, change: "down" },
    { id: 14, name: "Sophia Martinez", username: "@smartinez", rating: 3.7, ratings: 39, change: "up" },
    { id: 15, name: "Daniel Taylor", username: "@dtaylor", rating: 3.6, ratings: 37, change: "down" },
    { id: 16, name: "Olivia Anderson", username: "@oanderson", rating: 3.5, ratings: 34, change: "same" },
    { id: 17, name: "James Wilson", username: "@jwilson", rating: 3.4, ratings: 31, change: "up" },
    { id: 18, name: "Ava Thomas", username: "@athomas", rating: 3.3, ratings: 29, change: "down" },
    { id: 19, name: "Benjamin Harris", username: "@bharris", rating: 3.2, ratings: 27, change: "up" },
    { id: 20, name: "Mia Jackson", username: "@mjackson", rating: 3.1, ratings: 25, change: "same" },
  ]

  // Filter profiles that start with the search term (case insensitive)
  const filteredProfiles = allProfiles.filter((profile) => {
    if (!searchTerm) return true

    const term = searchTerm.toLowerCase()
    return profile.name.toLowerCase().startsWith(term) || profile.username.toLowerCase().startsWith(term)
  })

  // Animation for search results
  const [showResults, setShowResults] = useState(true)

  useEffect(() => {
    setShowResults(false)
    const timer = setTimeout(() => {
      setShowResults(true)
    }, 100)
    return () => clearTimeout(timer)
  }, [searchTerm])

  // Get top 3 profiles for special styling
  const topProfiles = allProfiles.slice(0, 3)

  useEffect(() => {
    // Short delay to ensure the input is rendered
    const timer = setTimeout(() => {
      if (searchInputRef.current) {
        searchInputRef.current.focus()
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [])

  return (
    <AppLayout>
      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-3">
          <h1 className="text-4xl font-bold tracking-tight glow-text bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-500">
            Leaderboard
          </h1>
   
        </div>

        {/* Top 3 Profiles Showcase */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          
        </div>

        {/* Prominent Search Bar */}
        <div className="">
          <div className={`relative w-full transition-all duration-300 ${isSearchFocused ? "scale-102" : ""}`}>
            <div className="absolute inset-0 -m-1 bg-gradient-to-r from-primary/50 to-purple-500/50 rounded-2xl blur-md opacity-70 animate-pulse-glow"></div>
            <div className="relative bg-secondary/30 backdrop-blur-sm rounded-xl border border-primary/30 shadow-xl overflow-hidden">
              <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
                <Search
                  className={`h-6 w-6 transition-colors duration-300 ${isSearchFocused ? "text-primary" : "text-primary/70"}`}
                />
              </div>
              <Input
                ref={searchInputRef}
                placeholder="Search profiles by name or username..."
                className="pl-14 pr-36 py-7 text-lg  border-0 placeholder:text-foreground/50 focus-visible:ring-0 focus-visible:ring-offset-0"
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
                    className="h-9 rounded-lg bg-background/20 hover:bg-background/40 text-foreground"
                    onClick={() => setSearchTerm("")}
                  >
                    Clear
                  </Button>
                )}
                <div className="h-10 px-3 rounded-lg bg-primary flex items-center gap-2 shadow-md">
                  <TrendingUp className="h-5 w-5" />
                  <div>
                    <p className="text-xs font-medium leading-none">Your Rank</p>
                    <p className="text-lg font-bold leading-none">#42</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Leaderboard List */}
        <Card className="overflow-hidden border-0 shadow-xl bg-gradient-to-b from-background to-secondary/10">
          <CardHeader className="pb-0 border-b border-border/20">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-500">
                  All Profiles
                </CardTitle>
                <CardDescription className="text-base">
                  {filteredProfiles.length} profiles found
                  {searchTerm && ` for "${searchTerm}"`}
                </CardDescription>
              </div>
              {searchTerm && filteredProfiles.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchTerm("")}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Clear search
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className={`transition-opacity duration-300 ${showResults ? "opacity-100" : "opacity-0"}`}>
              {filteredProfiles.length > 0 ? (
                filteredProfiles.map((profile, index) => (
                  <div
                    key={profile.id}
                    className={`flex items-center gap-4 p-5 border-b border-border/20 hover:bg-secondary/20 transition-all duration-300 animate-slide-up ${
                      index < 3 ? "bg-gradient-to-r from-primary/5 to-transparent" : ""
                    }`}
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <div
                      className={`w-8 text-center font-bold text-lg ${
                        index === 0
                          ? "text-yellow-400"
                          : index === 1
                            ? "text-gray-300"
                            : index === 2
                              ? "text-amber-600"
                              : ""
                      }`}
                    >
                      {index + 1}
                    </div>

                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center shadow-md ${
                        index === 0
                          ? "bg-gradient-to-r from-yellow-500/30 to-yellow-600/30 ring-2 ring-yellow-500/30"
                          : index === 1
                            ? "bg-gradient-to-r from-gray-400/30 to-gray-500/30 ring-2 ring-gray-400/30"
                            : index === 2
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

                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <span className="font-bold">{profile.rating}</span>
                            <RatingStars
                              initialRating={0}
                              displayOnly={false}
                              size="sm"
                              profileId={profile.id.toString()}
                            />
                            <span className="text-xs text-muted-foreground">({profile.ratings})</span>
                          </div>

                          <div className="hidden sm:flex items-center">
                            {profile.change === "up" && <span className="text-green-500 text-sm font-bold">↑</span>}
                            {profile.change === "down" && <span className="text-red-500 text-sm font-bold">↓</span>}
                            {profile.change === "same" && <span className="text-muted-foreground text-sm">-</span>}
                          </div>

                          <Link href={`/profile/${profile.id}`}>
                            <Button variant="ghost" size="sm" className="glow-effect rounded-full px-4">
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
                    We couldn't find any profiles matching "{searchTerm}". Try a different search term or browse all
                    profiles.
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
    </AppLayout>
  )
}

