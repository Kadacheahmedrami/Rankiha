"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { MessageSquare, Send, X } from "lucide-react"

interface Profile {
  id: string
  name: string
  username: string
  rating: number
  ratings: number | null
  change: "up" | "down" | "same"
  image: string
  rank: number
}

interface CommentModalProps {
  isOpen: boolean
  onClose: () => void
  profile: Profile
  onSubmit: (comment: string) => Promise<boolean>
}

export default function CommentModal({ isOpen, onClose, profile, onSubmit }: CommentModalProps) {
  const [comment, setComment] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [characterCount, setCharacterCount] = useState(0)
  const MAX_COMMENT_LENGTH = 500
  const modalRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Handle character count
  useEffect(() => {
    setCharacterCount(comment.length)
  }, [comment])

  // Focus textarea when modal opens
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      setTimeout(() => {
        textareaRef.current?.focus()
      }, 100)
    }
  }, [isOpen])

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen, onClose])

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = "auto"
    }

    return () => {
      document.body.style.overflow = "auto"
    }
  }, [isOpen])

  // Handle comment submission
  const handleSubmit = async () => {
    if (!comment.trim() || isSubmitting) return

    setIsSubmitting(true)
    const success = await onSubmit(comment)

    if (success) {
      setComment("")
      onClose()
    }

    setIsSubmitting(false)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
      <div
        ref={modalRef}
        className="w-full sm:w-[450px] max-h-[90vh] sm:max-h-[600px] bg-background rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden transform animate-in slide-in-from-bottom sm:slide-in-from-center duration-300"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/20">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center shadow-md ${
                profile.rank === 1
                  ? "bg-gradient-to-r from-yellow-500/30 to-yellow-600/30 ring-1 ring-yellow-500/30"
                  : profile.rank === 2
                    ? "bg-gradient-to-r from-gray-400/30 to-gray-500/30 ring-1 ring-gray-400/30"
                    : profile.rank === 3
                      ? "bg-gradient-to-r from-amber-600/30 to-amber-700/30 ring-1 ring-amber-600/30"
                      : "bg-gradient-to-r from-primary/20 to-purple-500/20"
              }`}
            >
              <span className="font-bold">{profile.name.charAt(0)}</span>
            </div>
            <div>
              <h3 className="font-medium text-lg leading-tight">Comment on {profile.name}'s profile</h3>
              <p className="text-xs text-muted-foreground">
                Rank #{profile.rank} • {profile.rating.toFixed(1)} stars
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 hover:bg-secondary/50" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Comment Form */}
        <div className="p-4 flex-1 overflow-auto">
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Leave your comment</span>
            </div>

            <div className="relative">
              <Textarea
                ref={textareaRef}
                className="min-h-[150px] bg-secondary/10 border-0 focus-visible:ring-1 focus-visible:ring-primary/50 resize-none"
                placeholder="Share your thoughts about this profile..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                maxLength={MAX_COMMENT_LENGTH}
              />
              <div
                className={`absolute bottom-2 right-2 text-xs ${
                  characterCount > MAX_COMMENT_LENGTH * 0.8 ? "text-orange-500" : "text-muted-foreground"
                }`}
              >
                {characterCount}/{MAX_COMMENT_LENGTH}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border/20 bg-secondary/10">
          <div className="flex justify-between items-center">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!comment.trim() || isSubmitting || characterCount > MAX_COMMENT_LENGTH}
              className="gap-2 bg-gradient-to-r from-primary to-purple-500 hover:from-primary/90 hover:to-purple-500/90 transition-all"
            >
              {isSubmitting ? "Posting..." : "Post Comment"}
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

