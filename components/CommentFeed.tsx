"use client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { MessageSquare, Flag } from "lucide-react"
import Link from "next/link"
import { useEffect, useState, useRef } from "react"
import { useSession } from "next-auth/react"
import toast from "react-hot-toast"

// Interface for Comment
interface Comment {
  id: string
  content: string
  createdAt: string
  targetUser: {
    id: string
    name: string
    email: string
  }
}

export default function CommentFeed() {
  const { data: session } = useSession()
  const [comments, setComments] = useState<Comment[]>([])
  const [page, setPage] = useState<number>(1)
  const [limit] = useState<number>(20)
  const [totalPages, setTotalPages] = useState<number>(1)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isFetchingMore, setIsFetchingMore] = useState<boolean>(false)
  const [reportingCommentId, setReportingCommentId] = useState<string | null>(null)

  const loaderRef = useRef<HTMLDivElement>(null)

  // Fetch comments feed with pagination
  const fetchCommentsFeed = async (): Promise<void> => {
    try {
      setIsLoading(true)
      const queryParams = new URLSearchParams()
      queryParams.append("page", page.toString())
      queryParams.append("limit", limit.toString())
      const query = "?" + queryParams.toString()

      const res = await fetch(`/api/commentfeed${query}`)
      if (!res.ok) {
        console.error("Error fetching comments:", res.statusText)
        setIsLoading(false)
        return
      }

      const json = await res.json()

      // If we're on page 1, replace the comments; otherwise, append new results
      if (page === 1) {
        setComments(json.data)
      } else {
        setComments((prev) => [...prev, ...json.data])
      }

      setTotalPages(json.pagination.totalPages)
      setIsFetchingMore(false)
      setIsLoading(false)
    } catch (error) {
      console.error("Error fetching comments:", error)
      setIsFetchingMore(false)
      setIsLoading(false)
    }
  }

  // Handle reporting a comment
  const handleReportComment = async (commentId: string) => {
    if (!session?.user?.id) {
      toast.error("You must be logged in to report a comment")
      return
    }

    try {
      setReportingCommentId(commentId)

      const response = await fetch("/api/report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reporterUserId: session.user.id,
          commentId: commentId,
          timestamp: new Date().toISOString(),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to report comment")
      }

      toast.success("Comment reported successfully")
    } catch (error) {
      console.error("Error reporting comment:", error)
      toast.error("Failed to report comment. Please try again.")
    } finally {
      setReportingCommentId(null)
    }
  }

  // Format date to a more readable format
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  // Fetch comments feed on initial load and when page changes
  useEffect(() => {
    fetchCommentsFeed()
  }, [page])

  // Set up intersection observer for infinite scrolling
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries
        if (entry.isIntersecting && !isLoading && !isFetchingMore && page < totalPages) {
          setIsFetchingMore(true)
          setPage((prev) => prev + 1)
        }
      },
      { threshold: 0.1 },
    )

    const currentLoaderRef = loaderRef.current
    if (currentLoaderRef) {
      observer.observe(currentLoaderRef)
    }

    return () => {
      if (currentLoaderRef) {
        observer.unobserve(currentLoaderRef)
      }
    }
  }, [isLoading, isFetchingMore, page, totalPages])

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex flex-col gap-3 mb-6">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight glow-text bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-500">
          Comment Feed
        </h1>
      </div>

      <Card className="overflow-hidden border-0 shadow-xl bg-gradient-to-b from-background to-secondary/10">
        <CardHeader className="pb-4 border-b border-border/20">
          <CardTitle className="text-xl sm:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-500">
            Latest Comments
          </CardTitle>
          <CardDescription className="text-sm sm:text-base">
            See what people are saying about each other
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading && page === 1 ? (
            <div className="flex justify-center items-center p-12">
              <div className="animate-pulse text-center">
                <MessageSquare className="h-12 w-12 text-primary/40 mx-auto mb-4" />
                <p className="text-muted-foreground">Loading comments...</p>
              </div>
            </div>
          ) : comments.length > 0 ? (
            <div>
              {comments.map((comment) => (
                <div
                  key={comment.id}
                  className="p-6 border-b border-border/20 hover:bg-secondary/20 transition-all duration-300"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-1">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-3">
                        <div className="flex items-center flex-wrap">
                          <span className="mx-2 text-muted-foreground flex items-center">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M5 12h14"></path>
                              <path d="M12 5l7 7-7 7"></path>
                            </svg>
                          </span>
                          <Link
                            href={`/profile/${comment.targetUser.id}`}
                            className="font-bold text-lg hover:underline"
                          >
                            {comment.targetUser.name}
                          </Link>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-sm text-muted-foreground">{formatDate(comment.createdAt)}</span>
                          <button
                            onClick={() => handleReportComment(comment.id)}
                            disabled={reportingCommentId === comment.id}
                            className="text-muted-foreground hover:text-destructive transition-colors duration-200 flex items-center"
                            title="Report this comment"
                            aria-label="Report comment"
                          >
                            {reportingCommentId === comment.id ? (
                              <svg
                                className="animate-spin h-4 w-4"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                              >
                                <circle
                                  className="opacity-25"
                                  cx="12"
                                  cy="12"
                                  r="10"
                                  stroke="currentColor"
                                  strokeWidth="4"
                                ></circle>
                                <path
                                  className="opacity-75"
                                  fill="currentColor"
                                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                ></path>
                              </svg>
                            ) : (
                              <Flag className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="bg-secondary/20 p-4 rounded-lg border border-border/10">
                        <p className="text-base sm:text-lg">{comment.content}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {page < totalPages && (
                <div ref={loaderRef} className="p-6 text-center">
                  {isFetchingMore && (
                    <div className="flex items-center justify-center gap-2">
                      <svg
                        className="animate-spin h-5 w-5 text-primary"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      <span>Loading more comments...</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="p-12 text-center">
              <MessageSquare className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-xl font-medium mb-2">No comments yet</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                There are no comments to display at the moment. Check back later!
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

