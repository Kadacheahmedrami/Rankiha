"use client"

import { useState, useEffect } from "react"
import RatingStars from "@/components/rating-stars"
import { ArrowUp, ArrowDown, Trophy, Medal, Award } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import { Badge } from "@/components/ui/badge"

type ArticleLeaderboardItem = {
  id: string
  name: string
  description: string
  rating: number
  ratingsCount: number
  rank: number
  change: "up" | "down" | "same"
}

type LeaderboardWithStarsProps = {
  data: ArticleLeaderboardItem[]
  sessionUserId: string
  disableRating?: boolean
}

export default function LeaderboardWithStars({ data, sessionUserId, disableRating = false }: LeaderboardWithStarsProps) {
  const [leaderboardData, setLeaderboardData] = useState<ArticleLeaderboardItem[]>(data)
  const [isMobile, setIsMobile] = useState(false)
  const { toast } = useToast()

  // Check if we're on mobile
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 640)
    }

    checkIfMobile()
    window.addEventListener("resize", checkIfMobile)

    return () => {
      window.removeEventListener("resize", checkIfMobile)
    }
  }, [])

  const handleRatingChange = async (article: ArticleLeaderboardItem, newRating: number): Promise<void> => {
    if (disableRating) return // Rating is disabled, so do nothing

    try {
      const response = await fetch("/api/rating-article", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ratedArticleId: article.id, value: newRating }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        toast({
          variant: "destructive",
          description: errorData.error || "Failed to submit rating",
        })
      } else {
        toast({
          description: "Rating submitted successfully!",
        })
      }
      // Optionally: update the UI or refresh leaderboard data here.
    } catch (error: unknown) {
      console.error("Error submitting rating:", error)
      toast({
        variant: "destructive",
        description: "Error submitting rating",
      })
    }
  }

  // Get top 3 items
  const topThreeItems = leaderboardData.filter((item) => item.rank <= 3)
  // Get the rest of the items
  const restOfItems = leaderboardData.filter((item) => item.rank > 3)

  // Helper function to get rank icon and color
  const getRankDetails = (rank: number) => {
    switch (rank) {
      case 1:
        return {
          icon: <Trophy className="h-5 w-5" />,
          color: "bg-gradient-to-r from-yellow-300 to-yellow-500 text-yellow-950",
          borderColor: "border-yellow-400",
        }
      case 2:
        return {
          icon: <Medal className="h-5 w-5" />,
          color: "bg-gradient-to-r from-gray-300 to-gray-400 text-gray-800",
          borderColor: "border-gray-400",
        }
      case 3:
        return {
          icon: <Award className="h-5 w-5" />,
          color: "bg-gradient-to-r from-amber-600 to-amber-700 text-amber-50",
          borderColor: "border-amber-600",
        }
      default:
        return {
          icon: null,
          color: "bg-primary text-primary-foreground",
          borderColor: "border-border",
        }
    }
  }

  return (
    <div className="space-y-6">
      {/* Top 3 Section */}
      {topThreeItems.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Top clubs
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {topThreeItems.map((article) => {
              const { icon, color, borderColor } = getRankDetails(article.rank)

              return (
                <motion.div
                  key={article.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: article.rank * 0.1 }}
                  className={cn(
                    "flex flex-col p-4 rounded-lg shadow-md border-2",
                    borderColor,
                    article.rank === 1
                      ? "sm:order-2 sm:scale-110 z-10"
                      : article.rank === 2
                        ? "sm:order-1"
                        : "sm:order-3",
                  )}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className={cn("flex items-center justify-center w-8 h-8 rounded-full font-bold", color)}>
                      {icon || article.rank}
                    </div>

                    {article.change !== "same" && (
                      <Badge className="flex items-center gap-1">
                        {article.change === "up" ? (
                          <>
                            <ArrowUp className="h-3 w-3" />
                            <span className="text-xs">Up</span>
                          </>
                        ) : (
                          <>
                            <ArrowDown className="h-3 w-3" />
                            <span className="text-xs">Down</span>
                          </>
                        )}
                      </Badge>
                    )}
                  </div>

                  <h4 className="font-bold text-lg line-clamp-1">{article.name}</h4>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3 flex-grow">{article.description}</p>

                  <div className="mt-auto">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl font-bold">{article.rating.toFixed(1)}</span>
                      <span className="text-xs text-muted-foreground">({article.ratingsCount} ratings)</span>
                    </div>

                    <RatingStars
                      initialRating={article.rating}
                      displayOnly={disableRating ? true : false}
                      size="sm"
                      profileId={article.id}
                      disableSelfRating={disableRating ? true : false}
                      onRate={(newRating: number) => handleRatingChange(article, newRating)}
                    />
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      )}

      {/* Rest of the Leaderboard */}
      {restOfItems.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Other Clubs</h3>
          <div className="space-y-3">
            {restOfItems.map((article) => (
              <motion.div
                key={article.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 rounded-lg border hover:shadow-sm transition-shadow"
              >
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-muted-foreground font-medium">
                  {article.rank}
                </div>

                <div className="flex-grow min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <h4 className="font-medium line-clamp-1">{article.name}</h4>

                    {article.change !== "same" && (
                      <div className="flex items-center">
                        {article.change === "up" ? (
                          <span className="text-xs text-green-500 flex items-center gap-1">
                            <ArrowUp className="h-3 w-3" /> Rising
                          </span>
                        ) : (
                          <span className="text-xs text-red-500 flex items-center gap-1">
                            <ArrowDown className="h-3 w-3" /> Falling
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <p className="text-sm text-muted-foreground line-clamp-1 mb-2">{article.description}</p>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{article.rating.toFixed(1)}</span>
                      <RatingStars
                        initialRating={article.rating}
                        displayOnly={disableRating ? true : false}
                        size="sm"
                        profileId={article.id}
                        disableSelfRating={disableRating ? true : false}
                        onRate={(newRating: number) => handleRatingChange(article, newRating)}
                      />
                      <span className="text-xs text-muted-foreground">({article.ratingsCount})</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
