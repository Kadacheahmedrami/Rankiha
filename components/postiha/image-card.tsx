"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowBigUp,
  ArrowBigDown,
  ArrowUp,
  ArrowDown,
  Loader2,
} from "lucide-react";

interface ImagePost {
  id: string;
  imageUrl: string;
  title: string;
  upvotes: number;
  downvotes: number;
  createdAt: string;
}

interface ImageCardProps {
  post: ImagePost;
  onVote: (
    postId: string,
    voteType: "upvote" | "downvote",
    previousVote: "upvote" | "downvote" | null
  ) => Promise<any>;
}

export default function ImageCard({ post, onVote }: ImageCardProps) {
  const [isImageLoading, setIsImageLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const [userVote, setUserVote] = useState<"upvote" | "downvote" | null>(null);
  const [localUpvotes, setLocalUpvotes] = useState(post.upvotes);
  const [localDownvotes, setLocalDownvotes] = useState(post.downvotes);

  // Net vote count based on local state
  const netVotes = localUpvotes - localDownvotes;

  // Initialize user vote from localStorage
  useEffect(() => {
    const savedVote = localStorage.getItem(`vote-${post.id}`);
    if (savedVote === "upvote" || savedVote === "downvote") {
      setUserVote(savedVote);
    }
  }, [post.id]);

  // Sync local vote counts when post props update
  useEffect(() => {
    setLocalUpvotes(post.upvotes);
    setLocalDownvotes(post.downvotes);
  }, [post.upvotes, post.downvotes]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleVote = async (voteType: "upvote" | "downvote") => {
    if (voting) return;
    // Prevent multiple votes in the same direction.
    if (userVote === voteType) return;
    setVoting(true);
    const prevVote = userVote;

    // Optimistic update
    if (prevVote === "upvote" && voteType === "downvote") {
      setLocalUpvotes((prev) => prev - 1);
      setLocalDownvotes((prev) => prev + 1);
    } else if (prevVote === "downvote" && voteType === "upvote") {
      setLocalDownvotes((prev) => prev - 1);
      setLocalUpvotes((prev) => prev + 1);
    } else if (!prevVote && voteType === "upvote") {
      setLocalUpvotes((prev) => prev + 1);
    } else if (!prevVote && voteType === "downvote") {
      setLocalDownvotes((prev) => prev + 1);
    }
    setUserVote(voteType);
    localStorage.setItem(`vote-${post.id}`, voteType);

    try {
      // Pass previous vote to parent to update the global state accordingly
      await onVote(post.id, voteType, prevVote);
    } catch (error) {
      // Roll back optimistic changes on error
      setUserVote(prevVote);
      setLocalUpvotes(post.upvotes);
      setLocalDownvotes(post.downvotes);
      if (prevVote) {
        localStorage.setItem(`vote-${post.id}`, prevVote);
      } else {
        localStorage.removeItem(`vote-${post.id}`);
      }
      console.error("Vote error:", error);
    } finally {
      setVoting(false);
    }
  };

  return (
    <Card className="overflow-hidden border border-border/20 hover:shadow-xl transition-all duration-300 bg-secondary/5 h-full flex flex-col rounded-lg">
      <div className="relative aspect-square w-full overflow-hidden">
        <Image
          src={post.imageUrl || "/placeholder.svg?height=400&width=400"}
          alt={post.title}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw"
          className="object-cover transition-opacity duration-500 ease-in-out"
          style={{ opacity: isImageLoading ? 0 : 1 }}
          onLoadingComplete={() => setIsImageLoading(false)}
        />
        {isImageLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-secondary/20">
            <Loader2 className="animate-spin h-8 w-8 text-primary" />
          </div>
        )}
        <div className="absolute top-2 right-2 bg-background/80 px-2 py-1 rounded text-xs text-muted-foreground">
          {formatDate(post.createdAt)}
        </div>
      </div>
      <CardContent className="p-4 flex-grow">
        <div className="flex items-center justify-between space-x-4">
          {/* Post title */}
          <h3 className="font-semibold text-lg line-clamp-2">{post.title}</h3>
          {/* Voting controls */}
          <div className="flex items-center rounded-full bg-slate-800 gap-2 p-2">
            <button
              onClick={() => handleVote("upvote")}
              disabled={voting}
              aria-label="Upvote"
              className={`transition-colors ${
                userVote === "upvote"
                  ? "text-green-500"
                  : "hover:text-green-500"
              }`}
            >
              <ArrowBigUp className="h-6 w-6" />
            </button>
            <div className="flex items-center space-x-1">
              <span
                className={`text-sm font-medium ${
                  netVotes > 0
                    ? "text-green-500"
                    : netVotes < 0
                    ? "text-red-500"
                    : "text-muted-foreground"
                }`}
              >
                {netVotes}
              </span>
              {netVotes > 0 && <ArrowUp className="h-4 w-4 text-green-500" />}
              {netVotes < 0 && <ArrowDown className="h-4 w-4 text-red-500" />}
            </div>
            <button
              onClick={() => handleVote("downvote")}
              disabled={voting}
              aria-label="Downvote"
              className={`transition-colors ${
                userVote === "downvote" ? "text-red-500" : "hover:text-red-500"
              }`}
            >
              <ArrowBigDown className="h-6 w-6" />
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
