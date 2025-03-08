"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowLeft, Calendar, MapPin, Star, Award } from "lucide-react";
import Link from "next/link";
import AppLayout from "@/components/app-layout";

// Define the profile type
export type Profile = {
  id: string;
  name: string;
  username: string;
  bio: string;
  location: string;
  joinedDate: string;
  rating: number;
  totalRatings: number;
  ratingDistribution: number[];
};

// Update the component props to require an id
type ProfileComponentProps = {
  id: string;
};

export function ProfileComponent({ id }: ProfileComponentProps) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch profile data from /api/user/[id]
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch(`/api/user/${id}`);
        if (!res.ok) {
          throw new Error("Failed to fetch profile");
        }
        const data: Profile = await res.json();
        setProfile(data);
      } catch (err) {
        setError("Error loading profile");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [id]);

  if (loading) return <AppLayout><div className="p-6">Loading...</div></AppLayout>;
  if (error || !profile)
    return <AppLayout><div className="p-6">{error || "Profile not found"}</div></AppLayout>;

  return (
    <AppLayout>
      <div className="flex flex-col gap-8 p-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Link href="/leaderboard">
              <Button variant="ghost" size="sm" className="gap-1 rounded-full">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            </Link>
            <h1 className="text-3xl font-bold tracking-tight glow-text bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-500">
              Profile Page
            </h1>
          </div>
          <p className="text-lg">Welcome, {profile.name || "User"}!</p>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Profile Card */}
          <div className="lg:col-span-1">
            <Card className="overflow-hidden border-0 shadow-xl bg-gradient-to-b from-background to-secondary/10">
              <div className="h-32 bg-gradient-to-r from-primary/20 to-purple-500/20 relative">
                <div className="absolute inset-0 bg-[url('/placeholder.svg?height=200&width=600')] opacity-10 bg-cover bg-center"></div>
              </div>
              <CardContent className="pt-0 relative">
                <div className="w-24 h-24 rounded-full bg-gradient-to-r from-primary/50 to-purple-500/50 flex items-center justify-center absolute -top-12 left-6 ring-4 ring-background shadow-xl">
                  <span className="font-bold text-3xl">
                    {profile.name.charAt(0)}
                  </span>
                </div>
                <div className="absolute top-4 right-4">
                  <div className="bg-background/80 backdrop-blur-sm p-2 rounded-full shadow-lg">
                    <Award className="h-5 w-5 text-yellow-400" />
                  </div>
                </div>
                <div className="pt-16 pb-4 space-y-5">
                  <div>
                    <h2 className="text-2xl font-bold">{profile.name}</h2>
                    <p className="text-muted-foreground">{profile.username}</p>
                  </div>

                  <div className="flex items-center gap-2 p-3 bg-secondary/20 rounded-lg">
                    <div className="flex">
                      {Array(5)
                        .fill(0)
                        .map((_, i) => (
                          <Star
                            key={i}
                            className={`h-5 w-5 ${
                              i < Math.floor(profile.rating)
                                ? "text-yellow-400 fill-current"
                                : "text-muted-foreground"
                            }`}
                          />
                        ))}
                    </div>
                    <span className="font-bold text-lg">{profile.rating}</span>
                    <span className="text-sm text-muted-foreground">
                      ({profile.totalRatings} ratings)
                    </span>
                  </div>

                  <div className="p-4 border border-border/20 rounded-lg bg-secondary/10">
                    <p className="text-sm italic">{profile.bio}</p>
                  </div>

                  <div className="space-y-3 pt-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4 text-primary" />
                      <span>{profile.location}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4 text-primary" />
                      <span>Joined {profile.joinedDate}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Rating Overview */}
          <div className="lg:col-span-2">
            <Card className="overflow-hidden border-0 shadow-xl bg-gradient-to-b from-background to-secondary/10">
              <CardHeader>
                <CardTitle className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-500">
                  Rating Overview
                </CardTitle>
                <CardDescription>
                  Based on {profile.totalRatings} ratings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[5, 4, 3, 2, 1].map((rating, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="flex items-center gap-1 w-12">
                        <span className="font-medium">{rating}</span>
                        <Star className="h-4 w-4 text-yellow-400 fill-current" />
                      </div>
                      <div className="flex-1 h-3 bg-secondary/40 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            rating === 5
                              ? "bg-gradient-to-r from-primary to-purple-500"
                              : rating === 4
                              ? "bg-gradient-to-r from-blue-400 to-blue-500"
                              : rating === 3
                              ? "bg-gradient-to-r from-green-400 to-green-500"
                              : rating === 2
                              ? "bg-gradient-to-r from-yellow-400 to-yellow-500"
                              : "bg-gradient-to-r from-red-400 to-red-500"
                          }`}
                          style={{
                            width: `${
                              (profile.ratingDistribution[5 - rating] /
                                profile.totalRatings) *
                              100
                            }%`,
                          }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium w-12 text-right">
                        {profile.ratingDistribution[5 - rating]}
                      </span>
                      <span className="text-xs text-muted-foreground w-16 text-right">
                        {Math.round(
                          (profile.ratingDistribution[5 - rating] /
                            profile.totalRatings) *
                            100
                        )}
                        %
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="bg-secondary/10 border-0">
                    <CardContent className="p-4 text-center">
                      <h3 className="text-sm text-muted-foreground mb-1">
                        Average Rating
                      </h3>
                      <p className="text-3xl font-bold">{profile.rating}</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-secondary/10 border-0">
                    <CardContent className="p-4 text-center">
                      <h3 className="text-sm text-muted-foreground mb-1">
                        Total Ratings
                      </h3>
                      <p className="text-3xl font-bold">{profile.totalRatings}</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-secondary/10 border-0">
                    <CardContent className="p-4 text-center">
                      <h3 className="text-sm text-muted-foreground mb-1">
                        5-Star Ratings
                      </h3>
                      <p className="text-3xl font-bold">
                        {profile.ratingDistribution[0]}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
