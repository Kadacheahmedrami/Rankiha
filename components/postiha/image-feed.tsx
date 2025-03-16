"use client";
import { useEffect, useState, useRef } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ImageIcon, Upload, Loader2 } from "lucide-react";
import ImageCard from "./image-card";
import UploadModal from "./upload-modal";
import { Button } from "@/components/ui/button";

interface ImagePost {
  id: string;
  imageUrl: string;
  title: string;
  upvotes: number;
  downvotes: number;
  createdAt: string;
}

export default function ImageFeed() {
  const [posts, setPosts] = useState<ImagePost[]>([]);
  const [page, setPage] = useState<number>(1);
  const [limit] = useState<number>(6);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isFetchingMore, setIsFetchingMore] = useState<boolean>(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);

  const loaderRef = useRef<HTMLDivElement>(null);

  const fetchImagePosts = async (): Promise<void> => {
    try {
      if (page === 1) setIsLoading(true);
      else setIsFetchingMore(true);

      const queryParams = new URLSearchParams();
      queryParams.append("page", page.toString());
      queryParams.append("limit", limit.toString());
      const query = "?" + queryParams.toString();

      const res = await fetch(`/api/postiha${query}`);
      if (!res.ok) {
        console.error("Error fetching images:", res.statusText);
        setIsLoading(false);
        setIsFetchingMore(false);
        return;
      }

      const json = await res.json();

      if (page === 1) {
        setPosts(json.data);
      } else {
        setPosts((prev) => [...prev, ...json.data]);
      }

      setTotalPages(json.pagination.totalPages);
      setIsFetchingMore(false);
      setIsLoading(false);
    } catch (error) {
      setIsFetchingMore(false);
      setIsLoading(false);
    }
  };

  const handleVote = async (
    postId: string,
    voteType: "upvote" | "downvote",
    previousVote: "upvote" | "downvote" | null
  ) => {
    try {
      const postIndex = posts.findIndex((post) => post.id === postId);
      if (postIndex === -1) return;

      const updatedPosts = [...posts];
      const post = { ...updatedPosts[postIndex] };

      // Update counts based on vote type and any previous vote
      if (voteType === "upvote") {
        if (previousVote === "downvote") {
          post.downvotes = Math.max(post.downvotes - 1, 0);
          post.upvotes += 1;
        } else if (!previousVote) {
          post.upvotes += 1;
        }
      } else if (voteType === "downvote") {
        if (previousVote === "upvote") {
          post.upvotes = Math.max(post.upvotes - 1, 0);
          post.downvotes += 1;
        } else if (!previousVote) {
          post.downvotes += 1;
        }
      }

      updatedPosts[postIndex] = post;
      setPosts(updatedPosts);

      const response = await fetch("/api/postiha/vote", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          postId,
          voteType,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to register vote");
      }
    } catch (error) {
      // Re-fetch posts on error to restore consistency
      fetchImagePosts();
    }
  };

  useEffect(() => {
    fetchImagePosts();
  }, [page]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (
          entry.isIntersecting &&
          !isLoading &&
          !isFetchingMore &&
          page < totalPages
        ) {
          setIsFetchingMore(true);
          setPage((prev) => prev + 1);
        }
      },
      { threshold: 0.1 }
    );

    const currentLoaderRef = loaderRef.current;
    if (currentLoaderRef) {
      observer.observe(currentLoaderRef);
    }

    return () => {
      if (currentLoaderRef) {
        observer.unobserve(currentLoaderRef);
      }
    };
  }, [isLoading, isFetchingMore, page, totalPages]);

  return (
    <>
      <Card className="overflow-hidden border-0 shadow-xl bg-gradient-to-b from-background to-secondary/10">
        <CardHeader className="pb-4 border-b border-border/20 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-xl sm:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-500">
              Trending Images
            </CardTitle>
            <CardDescription className="text-sm sm:text-base">
              Discover and share amazing visuals with the community
            </CardDescription>
          </div>
          <Button
            onClick={() => setIsUploadModalOpen(true)}
            className="bg-gradient-to-r from-primary to-purple-500 hover:from-primary/90 hover:to-purple-500/90 text-white"
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading && page === 1 ? (
            <div className="flex justify-center items-center p-12">
              <div className="animate-pulse text-center">
                <ImageIcon className="h-12 w-12 text-primary/40 mx-auto mb-4" />
                <p className="text-muted-foreground">Loading images...</p>
              </div>
            </div>
          ) : posts.length > 0 ? (
            <div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 sm:gap-4 p-4">
                {posts.map((post) => (
                  <ImageCard key={post.id} post={post} onVote={handleVote} />
                ))}
              </div>

              {page < totalPages && (
                <div ref={loaderRef} className="p-6 text-center">
                  {isFetchingMore && (
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="animate-spin h-5 w-5 text-primary" />
                      <span>Loading more images...</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="p-12 text-center">
              <ImageIcon className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-xl font-medium mb-2">No images yet</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Be the first to upload an image and start the conversation!
              </p>
              <Button
                onClick={() => setIsUploadModalOpen(true)}
                className="mt-4 bg-gradient-to-r from-primary to-purple-500 hover:from-primary/90 hover:to-purple-500/90 text-white"
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Image
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUploadSuccess={(newPost: ImagePost) => {
          setPosts((prevPosts) => [newPost, ...prevPosts]);
          setIsUploadModalOpen(false);
        }}
      />
    </>
  );
}
