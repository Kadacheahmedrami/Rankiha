"use client";

import React, { useState } from "react";
import RatingStars from "@/components/rating-stars";
import { ArrowUp, ArrowDown } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

type ArticleLeaderboardItem = {
  id: string;
  name: string;
  description: string;
  rating: number;
  ratingsCount: number;
  rank: number;
  change: "up" | "down" | "same";
};

type LeaderboardWithStarsProps = {
  data: ArticleLeaderboardItem[];
  sessionUserId: string;
};

export default function LeaderboardWithStars({
  data,
  sessionUserId,
}: LeaderboardWithStarsProps) {
  const [leaderboardData, setLeaderboardData] = useState<ArticleLeaderboardItem[]>(data);
  const { toast } = useToast();

  const handleRatingChange = async (
    article: ArticleLeaderboardItem,
    newRating: number
  ): Promise<void> => {
    try {
      const response = await fetch("/api/rating-article", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Updated: using ratedArticleId to match the API route
        body: JSON.stringify({ ratedArticleId: article.id, value: newRating }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        toast({
          variant: "destructive",
          description: errorData.error || "Failed to submit rating",
        });
      } else {
        toast({
          description: "Rating submitted successfully!",
        });
      }
      // Optionally: update the UI or refresh leaderboard data here.
    } catch (error: unknown) {
      console.error("Error submitting rating:", error);
      toast({
        variant: "destructive",
        description: "Error submitting rating",
      });
    }
  };

  return (
    <div className="space-y-4">
      {leaderboardData.map((article) => (
        <div
          key={article.id}
          className="flex items-center gap-4 p-3 rounded-lg border"
        >
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold">
            {article.rank}
          </div>
          <div className="flex-grow">
            <h4 className="font-medium">{article.name}</h4>
            <p className="text-sm text-muted-foreground">{article.description}</p>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 mt-2 sm:mt-0">
              <div className="flex items-center gap-2">
                <span className="font-bold">
                  {article.rating.toFixed(1)}
                </span>
                <RatingStars
                  initialRating={article.rating}
                  displayOnly={false}
                  size="sm"
                  profileId={article.id}
                  // For article ratings, self–rating isn't blocked
                  disableSelfRating={false}
                  onRate={(newRating: number) =>
                    handleRatingChange(article, newRating)
                  }
                />
                <span className="text-xs text-muted-foreground">
                  ({article.ratingsCount})
                </span>
              </div>
            </div>
          </div>
          <div className="text-right">
            {article.change !== "same" && (
              <div className="flex items-center justify-end">
                {article.change === "up" ? (
                  <ArrowUp className="h-4 w-4 text-green-500" />
                ) : (
                  <ArrowDown className="h-4 w-4 text-red-500" />
                )}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
