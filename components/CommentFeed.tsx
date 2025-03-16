"use client";

import Image from "next/image";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MessageSquare, Flag, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import { decrypt } from "@/lib/encryption";

// Interfaces for Comment and Post (decrypted data)
interface Comment {
  id: string;
  content: string;
  createdAt: string;
  targetUser: {
    id: string;
    name: string;
    email: string;
  };
}

interface Post {
  id: string;
  title: string;
  imageUrl: string;
  createdAt: string;
}

export default function Feed() {
  const { data: session } = useSession();

  // State for Comments
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsPage, setCommentsPage] = useState<number>(1);
  const [commentsTotalPages, setCommentsTotalPages] = useState<number>(1);
  const [isLoadingComments, setIsLoadingComments] = useState<boolean>(false);
  const [isLoadingMoreComments, setIsLoadingMoreComments] = useState<boolean>(false);

  // State for Posts
  const [posts, setPosts] = useState<Post[]>([]);
  const [postsPage, setPostsPage] = useState<number>(1);
  const [postsTotalPages, setPostsTotalPages] = useState<number>(1);
  const [isLoadingPosts, setIsLoadingPosts] = useState<boolean>(false);
  const [isLoadingMorePosts, setIsLoadingMorePosts] = useState<boolean>(false);

  // Refs for infinite scrolling
  const postsLoaderRef = useRef<HTMLDivElement>(null);
  const commentsLoaderRef = useRef<HTMLDivElement>(null);

  // Fetch posts from API and decrypt the response.
  const fetchPosts = async (): Promise<void> => {
    try {
      if (postsPage === 1) {
        setIsLoadingPosts(true);
      } else {
        setIsLoadingMorePosts(true);
      }
      const params = new URLSearchParams();
      params.append("postsPage", postsPage.toString());
      params.append("postsLimit", "10");
      const res = await fetch(`/api/feed?${params.toString()}`);
      if (!res.ok) {
        console.error("Error fetching posts:", res.statusText);
        toast.error("Failed to load posts");
        return;
      }
      const json = await res.json();
      // Decrypt each post field.
      const decryptedPosts: Post[] = json.posts.data.map((post: any) => ({
        id: decrypt(post.id),
        title: decrypt(post.title),
        imageUrl: decrypt(post.imageUrl),
        createdAt: decrypt(post.createdAt),
      }));
      if (postsPage === 1) {
        setPosts(decryptedPosts);
      } else {
        setPosts((prev) => [...prev, ...decryptedPosts]);
      }
      setPostsTotalPages(json.posts.pagination.totalPages);
    } catch (error) {
      console.error("Error fetching posts:", error);
      toast.error("Failed to load posts");
    } finally {
      setIsLoadingPosts(false);
      setIsLoadingMorePosts(false);
    }
  };

  // Fetch comments from API and decrypt the response.
  const fetchComments = async (): Promise<void> => {
    try {
      if (commentsPage === 1) {
        setIsLoadingComments(true);
      } else {
        setIsLoadingMoreComments(true);
      }
      const params = new URLSearchParams();
      params.append("commentsPage", commentsPage.toString());
      params.append("commentsLimit", "20");
      const res = await fetch(`/api/feed?${params.toString()}`);
      if (!res.ok) {
        console.error("Error fetching comments:", res.statusText);
        toast.error("Failed to load comments");
        return;
      }
      const json = await res.json();
      // Decrypt each comment and its nested targetUser fields.
      const decryptedComments: Comment[] = json.comments.data.map((comment: any) => ({
        id: decrypt(comment.id),
        content: decrypt(comment.content),
        createdAt: decrypt(comment.createdAt),
        targetUser: {
          id: decrypt(comment.targetUser.id),
          name: decrypt(comment.targetUser.name),
          email: decrypt(comment.targetUser.email),
        },
      }));
      if (commentsPage === 1) {
        setComments(decryptedComments);
      } else {
        setComments((prev) => [...prev, ...decryptedComments]);
      }
      setCommentsTotalPages(json.comments.pagination.totalPages);
    } catch (error) {
      console.error("Error fetching comments:", error);
      toast.error("Failed to load comments");
    } finally {
      setIsLoadingComments(false);
      setIsLoadingMoreComments(false);
    }
  };

  // Fetch posts when postsPage changes.
  useEffect(() => {
    fetchPosts();
  }, [postsPage]);

  // Fetch comments when commentsPage changes.
  useEffect(() => {
    fetchComments();
  }, [commentsPage]);

  // Infinite scroll: load next page when near bottom for posts.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (
          entry.isIntersecting &&
          !isLoadingPosts &&
          !isLoadingMorePosts &&
          postsPage < postsTotalPages
        ) {
          setPostsPage((prev) => prev + 1);
        }
      },
      { rootMargin: "100px" }
    );
    if (postsLoaderRef.current) {
      observer.observe(postsLoaderRef.current);
    }
    return () => {
      if (postsLoaderRef.current) {
        observer.unobserve(postsLoaderRef.current);
      }
    };
  }, [isLoadingPosts, isLoadingMorePosts, postsPage, postsTotalPages]);

  // Infinite scroll: load next page when near bottom for comments.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (
          entry.isIntersecting &&
          !isLoadingComments &&
          !isLoadingMoreComments &&
          commentsPage < commentsTotalPages
        ) {
          setCommentsPage((prev) => prev + 1);
        }
      },
      { rootMargin: "100px" }
    );
    if (commentsLoaderRef.current) {
      observer.observe(commentsLoaderRef.current);
    }
    return () => {
      if (commentsLoaderRef.current) {
        observer.unobserve(commentsLoaderRef.current);
      }
    };
  }, [isLoadingComments, isLoadingMoreComments, commentsPage, commentsTotalPages]);

  // Helper to format date.
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Skeleton loaders for posts and comments remain the same.
  const PostSkeleton = () => (
    <div className="w-[300px] flex-none animate-pulse bg-secondary/20 p-4 rounded-lg border border-border/10">
      <div className="h-6 w-3/4 bg-secondary/40 rounded mb-4"></div>
      <div className="w-full h-48 bg-secondary/40 rounded mb-2"></div>
      <div className="h-4 w-1/3 bg-secondary/40 rounded"></div>
    </div>
  );

  const CommentSkeleton = () => (
    <div className="p-6 animate-pulse">
      <div className="flex items-start">
        <div className="flex-1">
          <div className="flex justify-between items-start mb-3">
            <div className="h-5 w-1/3 bg-secondary/40 rounded"></div>
            <div className="h-4 w-1/4 bg-secondary/40 rounded"></div>
          </div>
          <div className="bg-secondary/20 p-4 rounded-lg border border-border/10">
            <div className="h-4 w-full bg-secondary/40 rounded mb-2"></div>
            <div className="h-4 w-3/4 bg-secondary/40 rounded"></div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="container mx-auto sm:py-8 max-w-6xl">
      {/* Posts Section */}
      <div className="mb-6 sm:mb-8">
        {/* ...Your posts rendering code */}
        <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide">
          {isLoadingPosts && postsPage === 1 ? (
            [...Array(3)].map((_, i) => <PostSkeleton key={i} />)
          ) : posts.length > 0 ? (
            posts.map((post) => (
              <div
                key={post.id}
                className="w-[300px] flex-none bg-secondary/20 p-4 rounded-lg border border-border/10 hover:bg-secondary/30 transition-all duration-300"
              >
                <h3 className="text-base sm:text-lg font-bold mb-2 line-clamp-1">
                  {post.title}
                </h3>
                {post.imageUrl && (
                  <div className="relative w-full aspect-square overflow-hidden">
                    <Image
                      src={post.imageUrl}
                      alt={post.title}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw"
                      className="object-cover transition-opacity duration-500 ease-in-out"
                    />
                  </div>
                )}
                <div className="flex justify-between items-center mt-2">
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    {formatDate(post.createdAt)}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-center py-6 text-muted-foreground">
              No posts available.
            </p>
          )}
          <div ref={postsLoaderRef} className="w-8 flex-shrink-0" />
        </div>
        {isLoadingMorePosts && (
          <div className="absolute bottom-0 left-0 right-0 flex justify-center pb-1">
            <div className="flex items-center justify-center space-x-1 text-xs text-primary">
              <div className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]"></div>
              <div className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]"></div>
              <div className="h-2 w-2 rounded-full bg-primary animate-bounce"></div>
            </div>
          </div>
        )}
      </div>

      {/* Comments Section */}
      <div>
        <div className="divide-y divide-border/20">
          {isLoadingComments && commentsPage === 1 ? (
            [...Array(3)].map((_, i) => <CommentSkeleton key={i} />)
          ) : comments.length > 0 ? (
            comments.map((comment) => (
              <div
                key={comment.id}
                className="p-4 sm:p-6 hover:bg-secondary/20 transition-all duration-300 flex items-start"
              >
                <div className="flex-1">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-3">
                    <div className="flex items-center flex-wrap">
                      <span className="mx-1 sm:mx-2 text-muted-foreground flex items-center">
                        <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4" />
                      </span>
                      <Link
                        href={`/profile/${comment.targetUser.id}`}
                        className="font-bold text-base sm:text-lg hover:underline"
                      >
                        {comment.targetUser.name}
                      </Link>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-4">
                      <span className="text-xs sm:text-sm text-muted-foreground">
                        {formatDate(comment.createdAt)}
                      </span>
                      <button
                        onClick={() => toast.error("Report feature not implemented")}
                        className="text-muted-foreground hover:text-destructive transition-colors duration-200 flex items-center"
                        title="Report this comment"
                        aria-label="Report comment"
                      >
                        <Flag className="h-3 w-3 sm:h-4 sm:w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="bg-secondary/20 p-4 rounded-lg border border-border/10">
                    <p className="text-sm sm:text-base">{comment.content}</p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 sm:p-12 text-center">
              <MessageSquare className="h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-lg sm:text-xl font-medium mb-2">No comments yet</h3>
              <p className="text-sm sm:text-base text-muted-foreground max-w-md mx-auto">
                There are no comments to display at the moment. Check back later!
              </p>
            </div>
          )}
          <div ref={commentsLoaderRef} className="h-8" />
          {isLoadingMoreComments && (
            <div className="py-4 flex justify-center">
              <div className="flex items-center justify-center space-x-2">
                <div className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]"></div>
                <div className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]"></div>
                <div className="h-2 w-2 rounded-full bg-primary animate-bounce"></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
