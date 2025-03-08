"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { TrendingUp, Search } from "lucide-react";
import Link from "next/link"; 
import RatingStars from "@/components/rating-stars";
import { useEffect, useState, useRef } from "react";
import Pusher from "pusher-js";


// Define a Profile interface to type the profile object
interface Profile {
  id: string;
  name: string;
  username: string;
  rating: number;
  ratings: number | null;
  change: 'up' | 'down' | 'same';
  image: string;
  userRatingId?: string; // Optional property if the current user already rated this profile
}

// Enhanced TypeScript version of the rating submission function
const handleRatingChange = async (profile: Profile, newRating: number): Promise<void> => {
  try {
    console.log("Submitting rating for profile:", profile);
    let response: Response;

    if (profile.userRatingId) {
      // Update existing rating using PATCH on /api/rating/[id]
      response = await fetch(`/api/rating/${profile.userRatingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: newRating }),
      });
    } else {
      // Create a new rating using POST on /api/rating
      response = await fetch("/api/rating", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ratedUserId: profile.id, value: newRating }),
      });
    }

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Error rating profile:", errorData.error || response.statusText);
      return;
    }

    const data = await response.json();
    console.log("Rating submitted successfully:", data);

    // Refresh the leaderboard after the rating update
    fetchLeaderboard(); // Ensure fetchLeaderboard is defined in your component's scope
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Error submitting rating:", error.message);
    } else {
      console.error("An unexpected error occurred while submitting the rating.");
    }
  }
};


export default function Leaderboard() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [profiles, setProfiles] = useState<any[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Fetch leaderboard data (assumed to include a `userRatingId` field when applicable)
  const fetchLeaderboard = async () => {
    try {
      const query = searchTerm ? `?search=${encodeURIComponent(searchTerm)}` : "";
      const res = await fetch(`/api/leaderboard${query}`);
      const data = await res.json();
      setProfiles(data);
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
    }
  };

  // Handle rating submission: update if rating exists, create new if not.
  const handleRatingChange = async (profile: any, newRating: number) => {
    try {
      console.log(profile)
      let res;
      if (profile.userRatingId) {
       
        // Update existing rating using PATCH on /api/rating/[id]
        res = await fetch(`/api/rating/${profile.userRatingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ value: newRating }),
        });
      } else {
        // Create new rating using POST on /api/rating
        res = await fetch("/api/rating", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ratedUserId: profile.id, value: newRating }),
        });
      }
      const data = await res.json();
      if (data.error) {
        console.error("Error rating profile:", data.error);
      } else {
        console.log("Rating submitted successfully:", data);
        // Refresh the leaderboard after the rating update
        fetchLeaderboard();
      }
    } catch (error) {
      console.error("Error submitting rating:", error);
    }
  };

  // Debounced fetch when searchTerm changes
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchLeaderboard();
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  // Initial fetch and subscribe to Pusher for real-time updates
  useEffect(() => {
    fetchLeaderboard();

    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    });
    const channel = pusher.subscribe("leaderboard");
    channel.bind("rating-updated", (updateData: { rating: number; profileId: string }) => {
      console.log("Rating update received:", updateData);
      fetchLeaderboard();
    });

    return () => {
      channel.unbind_all();
      channel.unsubscribe();
    };
  }, []);

  // Optional: Focus the search input after a short delay on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-3 mb-4">
        <h1 className="text-4xl font-bold tracking-tight glow-text bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-500">
          Leaderboard
        </h1>
      </div>

      {/* Prominent Search Bar */}
      <div className="">
        <div
          className={`relative w-full transition-all duration-300 ${
            isSearchFocused ? "scale-102" : ""
          }`}
        >
          <div className="absolute inset-0 -m-1 bg-gradient-to-r from-primary/50 to-purple-500/50 rounded-2xl blur-md opacity-70 animate-pulse-glow"></div>
          <div className="relative bg-secondary/30 backdrop-blur-sm rounded-xl border border-primary/30 shadow-xl overflow-hidden">
            <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
              <Search
                className={`h-6 w-6 transition-colors duration-300 ${
                  isSearchFocused ? "text-primary" : "text-primary/70"
                }`}
              />
            </div>
            <Input
              ref={searchInputRef}
              placeholder="Search profiles by name or username..."
              className="pl-14 pr-36 py-7 text-lg border-0 placeholder:text-foreground/50 focus-visible:ring-0 focus-visible:ring-offset-0"
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
                {profiles.length} profiles found
                {searchTerm && ` for "${searchTerm}"`}
              </CardDescription>
            </div>
            {searchTerm && profiles.length > 0 && (
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
          <div
            className={`transition-opacity duration-300 ${
              profiles.length ? "opacity-100" : "opacity-0"
            }`}
          >
            {profiles.length > 0 ? (
              profiles.map((profile, index) => (
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
                    <span className="font-bold text-lg">
                      {profile.name.charAt(0)}
                    </span>
                  </div>

                  <div className="flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div>
                        <h4 className="font-medium text-lg">{profile.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {profile.username}
                        </p>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold">{profile.rating}</span>
                          <RatingStars
                            initialRating={profile.rating}
                            displayOnly={false}
                            size="sm"
                            profileId={profile.id.toString()}
                            onRate={(newRating: number) =>
                              handleRatingChange(profile, newRating)
                            }
                          />
                          <span className="text-xs text-muted-foreground">
                            ({profile.ratings})
                          </span>
                        </div>

                        <div className="hidden sm:flex items-center">
                          {profile.change === "up" && (
                            <span className="text-green-500 text-sm font-bold">
                              ↑
                            </span>
                          )}
                          {profile.change === "down" && (
                            <span className="text-red-500 text-sm font-bold">
                              ↓
                            </span>
                          )}
                          {profile.change === "same" && (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </div>

                        <Link href={`/profile/${profile.id}`}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="glow-effect rounded-full px-4"
                          >
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
                  We couldn't find any profiles matching "
                  {searchTerm}". Try a different search term or browse all profiles.
                </p>
                <Button
                  variant="outline"
                  className="mt-4 glow-effect"
                  onClick={() => setSearchTerm("")}
                >
                  Show all profiles
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
