"use client"

import { Star } from "lucide-react"
import { useState } from "react"
import { toast } from "@/components/ui/use-toast"

interface RatingStarsProps {
  initialRating?: number
  displayOnly?: boolean
  size?: "sm" | "md" | "lg"
  profileId?: string
  onRate?: (rating: number) => void
}

export default function RatingStars({
  initialRating = 0,
  displayOnly = false,
  size = "md",
  profileId,
  onRate,
}: RatingStarsProps) {
  const [rating, setRating] = useState(initialRating)
  const [hoverRating, setHoverRating] = useState(0)
  const [hasRated, setHasRated] = useState(false)

  const handleRating = (value: number) => {
    if (displayOnly) return

    setRating(value)
    setHasRated(true)

    toast({
      title: "Rating submitted",
      description: `You rated ${profileId ? `profile #${profileId}` : "this profile"} ${value} stars.`,
    })

    if (onRate) {
      onRate(value)
    }
  }

  const starSize = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
  }

  return (
    <div className="flex items-center">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          className={`star-rating ${displayOnly ? "cursor-default" : "cursor-pointer"} p-0.5 group`}
          onClick={() => handleRating(star)}
          onMouseEnter={() => !displayOnly && setHoverRating(star)}
          onMouseLeave={() => !displayOnly && setHoverRating(0)}
          disabled={displayOnly || hasRated}
        >
          <Star
            className={`${starSize[size]} transition-all duration-200 ${
              (hoverRating || rating) >= star
                ? "text-yellow-400 fill-current group-hover:scale-110"
                : "text-muted-foreground group-hover:text-yellow-400/50"
            }`}
          />
        </button>
      ))}
    </div>
  )
}
