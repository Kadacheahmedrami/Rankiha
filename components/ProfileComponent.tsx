"use client"

import { useEffect, useState, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Star,
  Award,
  Send,
  MessageSquare,
  Lock,
} from "lucide-react"
import Link from "next/link"
import AppLayout from "@/components/app-layout"
import { useSession, signOut } from "next-auth/react"
import { Textarea } from "@/components/ui/textarea"
import toast from "react-hot-toast"

// Import Dialog components from your UI library
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog"

// Import Checkbox and Label components for the new field
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

// Define the profile type including anonymous comments
export type Profile = {
  id: string
  name: string
  username: string
  bio: string
  location: string

  rating: number
  totalRatings: number
  ratingDistribution: number[]
  comments: {
    content: string
    createdAt: string
  }[]
}

// Update the component props to require an id
type ProfileComponentProps = {
  id: string
}

export function ProfileComponent({ id }: ProfileComponentProps) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [commentText, setCommentText] = useState<string>("")
  const [commentLoading, setCommentLoading] = useState<boolean>(false)
  const [disableLoading, setDisableLoading] = useState<boolean>(false)
  const [showDisableModal, setShowDisableModal] = useState<boolean>(false)
  const MAX_COMMENT_LENGTH = 500

  // New state for sending private message
  const [privateMessageOpen, setPrivateMessageOpen] = useState(false)
  const [privateMessageText, setPrivateMessageText] = useState("")
  const [includeName, setIncludeName] = useState(true)
  const [sendingMessage, setSendingMessage] = useState(false)

  // Get current session to check if the profile is being viewed by its owner
  const { data: session } = useSession()
  const isOwnProfile = session?.user?.id === id

  // Fetch profile data from /api/user/[id]
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch(`/api/user/${id}`)
        if (!res.ok) {
          throw new Error("Failed to fetch profile")
        }
        const data: Profile = await res.json()
        setProfile(data)
      } catch (err) {
        setError("Error loading profile")
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [id])

  // Handle comment submission
  const handleCommentSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!commentText.trim()) return
    setCommentLoading(true)
    try {
      const res = await fetch(`/api/comment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          targetUserId: id,
          content: commentText,
        }),
      })
      if (!res.ok) {
        throw new Error("Failed to post comment")
      }
      const data = await res.json()
      // Assuming the response contains the new comment in data.comment
      if (data.comment) {
        setProfile((prevProfile) => {
          if (!prevProfile) return prevProfile
          return {
            ...prevProfile,
            comments: [data.comment, ...prevProfile.comments],
          }
        })
        setCommentText("")
      }
    } catch (err) {
      console.error(err)
    } finally {
      setCommentLoading(false)
    }
  }

  // Handle account disable after confirmation from the modal
  const handleConfirmDisable = async () => {
    setDisableLoading(true)
    try {
      const res = await fetch("/api/user/deactivate", {
        method: "POST",
      })
      if (!res.ok) {
        throw new Error("Failed to disable account")
      }
      // If disabling succeeded, sign out the user.
      signOut({ callbackUrl: "/" })
    } catch (err) {
      console.error(err)
      toast.error("Disabling account failed. Please try again.")
    } finally {
      setDisableLoading(false)
      setShowDisableModal(false)
    }
  }

  // Handle private message submission
  const handleSendPrivateMessage = async (e: FormEvent) => {
    e.preventDefault()
    if (!privateMessageText.trim()) return
    setSendingMessage(true)
    try {
      const res = await fetch(`/api/messages/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipientId: id,
          content: privateMessageText,
          includeSenderInfo: includeName,
        }),
      })
      if (!res.ok) {
        throw new Error("Failed to send message")
      }
      toast.success("Message sent successfully")
      setPrivateMessageText("")
      setPrivateMessageOpen(false)
    } catch (err) {
      console.error(err)
      toast.error("Failed to send message")
    } finally {
      setSendingMessage(false)
    }
  }

  if (loading)
    return (
      <AppLayout>
        <div className="p-6">Loading...</div>
      </AppLayout>
    )
  if (error || !profile)
    return (
      <AppLayout>
        <div className="p-6">{error || "Profile not found"}</div>
      </AppLayout>
    )

  // Safe default values
  const safeRating = profile.rating ?? 0
  const safeTotalRatings = profile.totalRatings ?? 0
  const safeDistribution =
    profile.ratingDistribution && profile.ratingDistribution.length === 5
      ? profile.ratingDistribution
      : [0, 0, 0, 0, 0]

  return (
    <AppLayout>
      <div className="flex flex-col gap-8 p-6">
        <div className="flex items-center gap-3">
          <Link href="/leaderboard" className="hidden md:block">
            <Button variant="ghost" size="sm" className="gap-1 rounded-full">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </Link>
      
          {/* Disable Account Button (only for own profile) */}
          {isOwnProfile && (
            <Dialog open={showDisableModal} onOpenChange={setShowDisableModal}>
              <DialogTrigger asChild>
                <Button
                  variant="destructive"
                  size="sm"
                  className="ml-auto flex items-center gap-2"
                  onClick={() => setShowDisableModal(true)}
                  disabled={disableLoading}
                >
                  <Lock className="h-4 w-4" />
                  {disableLoading ? "Disabling..." : "Disable Account"}
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-background shadow-xl rounded-lg p-6 sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-500">
                    Disable Account
                  </DialogTitle>
                  <DialogDescription className="mt-2 text-lg">
                    Are you sure you want to disable your account? You will be signed out immediately, and your profile, ratings, and comments will be hidden.  
                    If you do not sign in within the next 3 days, all your data will be permanently deleted.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter className="mt-4 flex justify-end gap-4">
                  <Button variant="ghost" onClick={() => setShowDisableModal(false)}>
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleConfirmDisable}
                    disabled={disableLoading}
                    className="flex items-center gap-2"
                  >
                    {disableLoading ? "Disabling..." : "Confirm Disable"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
        <p className="text-lg">Welcome, {profile.name || "User"}!</p>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Profile Card */}
          <div className="lg:col-span-1">
            <Card className="overflow-hidden border-0 shadow-xl bg-gradient-to-b from-background to-secondary/10 relative">
              <div className="h-32 bg-gradient-to-r from-primary/20 to-purple-500/20 relative">
                <div className="absolute inset-0 bg-[url('/placeholder.png?height=200&width=100')] opacity-100 bg-no-repeat bg-center"></div>
              </div>
              <CardContent className="pt-0 relative">
                <div className="w-24 h-24 rounded-full bg-gradient-to-r from-primary/50 to-purple-500/50 flex items-center justify-center absolute -top-12 left-6 ring-4 ring-background shadow-xl">
                  <span className="font-bold text-3xl">{profile.name ? profile.name.charAt(0) : "U"}</span>
                </div>
                <div className="absolute top-4 right-4">
                  <div className="bg-background/80 backdrop-blur-sm p-2 rounded-full shadow-lg">
                    <Award className="h-5 w-5 text-yellow-400" />
                  </div>
                </div>
                <div className="pt-16 pb-4 space-y-5">
                  <div>
                    <h2 className="text-2xl font-bold">{profile.name || "User"}</h2>
                    <p className="text-muted-foreground">{profile.username || "Username"}</p>
                  </div>

                  <div className="flex items-center gap-2 p-3 bg-secondary/20 rounded-lg">
                    <div className="flex">
                      {Array(5)
                        .fill(0)
                        .map((_, i) => (
                          <Star
                            key={i}
                            className={`h-5 w-5 ${
                              i < Math.floor(safeRating)
                                ? "text-yellow-400 fill-current"
                                : "text-muted-foreground"
                            }`}
                          />
                        ))}
                    </div>
                    <span className="font-bold text-lg">{safeRating}</span>
                    <span className="text-sm text-muted-foreground">({safeTotalRatings} ratings)</span>
                  </div>

                  <div className="space-y-3 pt-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4 text-primary" />
                      <span>{profile.location || "Estin"}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
              {/* Reduced padding between the card and the send message button */}
              {!isOwnProfile && (
                <div className="p-2">
                  <Dialog open={privateMessageOpen} onOpenChange={setPrivateMessageOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="w-full gap-2">
                        <Send className="h-4 w-4" />
                        Send Message
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-background shadow-xl rounded-lg p-6 sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-500">
                          Send Private Message
                        </DialogTitle>
                        <DialogDescription className="mt-2">
                          Your message will be sent privately to {profile.name}.
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleSendPrivateMessage} className="space-y-4 mt-4">
                        <Textarea
                          placeholder="Type your message here..."
                          className="min-h-[120px]"
                          value={privateMessageText}
                          onChange={(e) => setPrivateMessageText(e.target.value)}
                          required
                        />
                        {/* New Checkbox field for including sender's name */}
                        <div className="flex items-center space-x-2 mt-2">
                          <Checkbox
                            id="includeName"
                            checked={includeName}
                            onCheckedChange={(checked) => setIncludeName(checked as boolean)}
                          />
                          <Label htmlFor="includeName" className="text-sm">
                            Include my name in the message
                          </Label>
                        </div>
                        <DialogFooter className="mt-6 gap-2">
                          <Button type="button" variant="outline" onClick={() => setPrivateMessageOpen(false)} disabled={sendingMessage}>
                            Cancel
                          </Button>
                          <Button type="submit" className="gap-2 bg-gradient-to-r from-primary to-purple-500 hover:from-primary/90 hover:to-purple-500/90 transition-all" disabled={!privateMessageText.trim() || sendingMessage}>
                            {sendingMessage ? "Sending..." : (
                              <>
                                Send Message
                                <Send className="h-4 w-4" />
                              </>
                            )}
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              )}
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
                  {safeTotalRatings > 0
                    ? `Based on ${safeTotalRatings} ratings`
                    : "No ratings yet"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {safeTotalRatings > 0 ? (
                  <>
                    <div className="space-y-4">
                      {[5, 4, 3, 2, 1].map((rating, i) => {
                        const count = safeDistribution[5 - rating] || 0
                        const percentage = Math.round((count / safeTotalRatings) * 100)
                        return (
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
                                  width: `${(count / safeTotalRatings) * 100}%`,
                                }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium w-12 text-right">{count}</span>
                            <span className="text-xs text-muted-foreground w-16 text-right">{percentage}%</span>
                          </div>
                        )
                      })}
                    </div>

                    <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card className="bg-secondary/10 border-0">
                        <CardContent className="p-4 text-center">
                          <h3 className="text-sm text-muted-foreground mb-1">
                            Average Rating
                          </h3>
                          <p className="text-3xl font-bold">{safeRating}</p>
                        </CardContent>
                      </Card>
                      <Card className="bg-secondary/10 border-0">
                        <CardContent className="p-4 text-center">
                          <h3 className="text-sm text-muted-foreground mb-1">
                            Total Ratings
                          </h3>
                          <p className="text-3xl font-bold">{safeTotalRatings}</p>
                        </CardContent>
                      </Card>
                      <Card className="bg-secondary/10 border-0">
                        <CardContent className="p-4 text-center">
                          <h3 className="text-sm text-muted-foreground mb-1">
                            5-Star Ratings
                          </h3>
                          <p className="text-3xl font-bold">{safeDistribution[0] || 0}</p>
                        </CardContent>
                      </Card>
                    </div>
                  </>
                ) : (
                  <p className="text-center text-muted-foreground">No ratings available.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Comments Section */}
        <div className="mt-8">
          <Card className="overflow-hidden border-0 shadow-xl bg-gradient-to-b from-background to-secondary/10">
            <CardHeader>
              <CardTitle className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-500">
                Comments
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Enhanced Comment Input Field (only if not own profile) */}
              {!isOwnProfile && (
                <form onSubmit={handleCommentSubmit} className="mb-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 mb-2">
                      <MessageSquare className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">Leave a comment</span>
                    </div>

                    <div className="relative">
                      <Textarea
                        className="min-h-[100px] bg-secondary/10 border-0 focus-visible:ring-1 focus-visible:ring-primary/50 resize-none"
                        placeholder="Share your thoughts about this profile..."
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        maxLength={MAX_COMMENT_LENGTH}
                      />
                      <div className="absolute bottom-2 right-2 text-xs text-muted-foreground">
                        {commentText.length}/{MAX_COMMENT_LENGTH}
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button
                        type="submit"
                        disabled={commentLoading || !commentText.trim()}
                        className="gap-2 bg-gradient-to-r from-primary to-purple-500 hover:from-primary/90 hover:to-purple-500/90 transition-all"
                      >
                        {commentLoading ? "Posting..." : "Post Comment"}
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </form>
              )}

              {/* List Comments */}
              {profile.comments && profile.comments.length > 0 ? (
                <ul className="space-y-4">
                  {profile.comments.map((comment, idx) => (
                    <li key={idx} className="p-4 rounded-lg bg-secondary/10 border-l-2 border-primary/50">
                      <p className="text-sm mb-2">{comment.content}</p>
                      <span className="text-xs text-muted-foreground">
                        {new Date(comment.createdAt).toLocaleString()}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground text-center py-6">No comments yet.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  )
}
