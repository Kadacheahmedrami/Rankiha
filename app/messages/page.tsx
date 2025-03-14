"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Inbox,
  Trash2,
  Reply,
  AlertCircle,
  User,
  UserX,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "react-hot-toast";
import AppLayout from "@/components/app-layout";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

// Update PrivateMessage type to include an optional parent message property
export type PrivateMessage = {
  id: string;
  senderId: string;
  recipientId: string;
  content: string;
  createdAt: string;
  readAt?: string | null;
  isHidden: boolean;
  parentId?: string | null;
  // This field is returned by the backend; if absent, we'll show "Anonymous"
  senderName?: string | null;
  // New: Parent message details if available
  parent?: {
    id: string;
    content: string;
    createdAt: string;
  } | null;
};

export default function MessagesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [messages, setMessages] = useState<PrivateMessage[]>([]);
  const [filteredMessages, setFilteredMessages] = useState<PrivateMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [selectedMessage, setSelectedMessage] = useState<PrivateMessage | null>(null);
  const [replyDialogOpen, setReplyDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [includeName, setIncludeName] = useState<boolean>(false); // Default to anonymous
  const [replySending, setReplySending] = useState(false);
  const [page, setPage] = useState(1);
  const messagesPerPage = 10;

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("auth/signin");
    }
  }, [status, router]);

  // Fetch messages from backend
  useEffect(() => {
    const fetchMessages = async () => {
      if (status === "authenticated") {
        setLoading(true);
        try {
          const response = await fetch("/api/messages");
          const data = await response.json();
          if (!response.ok) {
            throw new Error(data.error || "Failed to fetch messages");
          }
          // Expecting data.messages array, which now includes parent details if available
          setMessages(data.messages);
          setFilteredMessages(data.messages);
        } catch (error) {
          console.error("Error fetching messages:", error);
          toast.error("Failed to load messages");
        } finally {
          setLoading(false);
        }
      }
    };

    fetchMessages();
  }, [status]);

  // Filter messages based on search query and active tab
  useEffect(() => {
    let filtered = [...messages];
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (message) =>
          message.content.toLowerCase().includes(query) ||
          (message.senderName && message.senderName.toLowerCase().includes(query))
      );
    }
    if (activeTab === "unread") {
      filtered = filtered.filter((message) => !message.readAt && !message.isHidden);
    } else if (activeTab === "all") {
      filtered = filtered.filter((message) => !message.isHidden);
    }
    setFilteredMessages(filtered);
    setPage(1);
  }, [messages, searchQuery, activeTab]);

  // Handle selecting a message
  const handleSelectMessage = async (message: PrivateMessage) => {
    setSelectedMessage(message);
    if (!message.readAt) {
      try {
        const response = await fetch(`/api/messages/${message.id}/read`, {
          method: "POST",
        });
        if (response.ok) {
          setMessages((prevMessages) =>
            prevMessages.map((msg) =>
              msg.id === message.id ? { ...msg, readAt: new Date().toISOString() } : msg
            )
          );
        }
      } catch (error) {
        console.error("Error marking message as read:", error);
      }
    }
  };

  // Handle replying to a message
  const handleReply = async () => {
    if (!selectedMessage || !replyText.trim()) return;
    setReplySending(true);
    try {
      const response = await fetch("/api/messages/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipientId: selectedMessage.senderId,
          content: replyText,
          includeSenderInfo: includeName,
          parentId: selectedMessage.id,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to send reply");
      }
      toast.success("Reply sent successfully");
      setReplyText("");
      setReplyDialogOpen(false);
    } catch (error) {
      console.error("Error sending reply:", error);
      toast.error("An error occurred while sending your reply");
    } finally {
      setReplySending(false);
    }
  };

  // Handle deleting a message
  const handleDeleteMessage = async () => {
    if (!selectedMessage) return;
    try {
      const response = await fetch(`/api/messages/${selectedMessage.id}/delete`, {
        method: "POST",
      });
      if (response.ok) {
        setMessages((prevMessages) =>
          prevMessages.map((msg) =>
            msg.id === selectedMessage.id ? { ...msg, isHidden: true } : msg
          )
        );
        toast.success("Message deleted");
        setSelectedMessage(null);
      } else {
        toast.error("Failed to delete message");
      }
    } catch (error) {
      console.error("Error deleting message:", error);
      toast.error("An error occurred while deleting the message");
    } finally {
      setDeleteDialogOpen(false);
      toast("Delete operation completed");
    }
  };

  // Pagination calculations
  const totalPages = Math.ceil(filteredMessages.length / messagesPerPage);
  const paginatedMessages = filteredMessages.slice((page - 1) * messagesPerPage, page * messagesPerPage);

  // Helper to format date display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffInDays === 0) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } else if (diffInDays === 1) {
      return "Yesterday";
    } else if (diffInDays < 7) {
      return date.toLocaleDateString([], { weekday: "long" });
    } else {
      return date.toLocaleDateString();
    }
  };

  if (status === "loading" || (status === "authenticated" && loading)) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading messages...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto py-6 px-4 md:px-6">
        <div className="flex flex-col space-y-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <h1 className="text-3xl font-bold">Messages</h1>
            <div className="relative w-full md:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search messages..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button className="absolute right-2.5 top-2.5" onClick={() => setSearchQuery("")}>
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              )}
            </div>
          </div>

          <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 md:w-auto">
              <TabsTrigger value="all" className="flex items-center gap-2">
                <Inbox className="h-4 w-4" />
                <span className="hidden md:inline">All Messages</span>
                <span className="md:hidden">All</span>
              </TabsTrigger>
              <TabsTrigger value="unread" className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                <span className="hidden md:inline">Unread</span>
                <span className="md:hidden">Unread</span>
                {messages.filter((m) => !m.readAt && !m.isHidden).length > 0 && (
                  <Badge variant="destructive" className="ml-1">
                    {messages.filter((m) => !m.readAt && !m.isHidden).length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-4">
              <MessageList
                messages={paginatedMessages}
                selectedMessage={selectedMessage}
                onSelectMessage={handleSelectMessage}
                onReply={(message) => {
                  setSelectedMessage(message);
                  setReplyDialogOpen(true);
                }}
                onDelete={(message) => {
                  setSelectedMessage(message);
                  setDeleteDialogOpen(true);
                }}
                formatDate={formatDate}
              />
            </TabsContent>

            <TabsContent value="unread" className="mt-4">
              <MessageList
                messages={paginatedMessages}
                selectedMessage={selectedMessage}
                onSelectMessage={handleSelectMessage}
                onReply={(message) => {
                  setSelectedMessage(message);
                  setReplyDialogOpen(true);
                }}
                onDelete={(message) => {
                  setSelectedMessage(message);
                  setDeleteDialogOpen(true);
                }}
                formatDate={formatDate}
              />
            </TabsContent>
          </Tabs>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Reply Dialog */}
        <Dialog open={replyDialogOpen} onOpenChange={setReplyDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Reply to Message</DialogTitle>
              <DialogDescription>
                {selectedMessage?.senderName
                  ? `Replying to ${selectedMessage.senderName}`
                  : "Replying to anonymous message"}
              </DialogDescription>
            </DialogHeader>
            
            <div className="bg-muted/50 p-3 rounded-md text-sm my-2">
              <p className="italic">{selectedMessage?.content}</p>
            </div>
            <Textarea
              placeholder="Type your reply here..."
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              className="min-h-[100px]"
            />
            <div className="flex items-center space-x-2 mt-2">
              <Checkbox
                id="includeName"
                checked={includeName}
                onCheckedChange={(checked) => setIncludeName(checked as boolean)}
              />
              <Label htmlFor="includeName" className="text-sm font-normal">
                Include my name in the reply
              </Label>
            </div>
            <DialogFooter className="sm:justify-between">
              <Button type="button" variant="outline" onClick={() => setReplyDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleReply}
                disabled={!replyText.trim() || replySending}
                className="gap-2"
              >
                {replySending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    Send Reply
                    <Reply className="h-4 w-4" />
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Delete Message</DialogTitle>
              <DialogDescription>Are you sure you want to delete this message?</DialogDescription>
            </DialogHeader>
            <DialogFooter className="sm:justify-between">
              <Button type="button" variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="button" variant="destructive" onClick={handleDeleteMessage} className="gap-2">
                Delete Message
                <Trash2 className="h-4 w-4" />
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}

// Message List Component
interface MessageListProps {
  messages: PrivateMessage[];
  selectedMessage: PrivateMessage | null;
  onSelectMessage: (message: PrivateMessage) => void;
  onReply?: (message: PrivateMessage) => void;
  onDelete?: (message: PrivateMessage) => void;
  formatDate: (date: string) => string;
}

function MessageList({ messages, selectedMessage, onSelectMessage, onReply, onDelete, formatDate }: MessageListProps) {
  if (messages.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="rounded-full bg-muted p-3">
            <Inbox className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-lg font-semibold">No messages found</h3>
          <p className="text-sm text-muted-foreground text-center max-w-sm mt-2">
            You don't have any messages matching your current filters.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Message List */}
      <div className="md:col-span-1 space-y-2 max-h-[70vh] overflow-y-auto pr-2">
        {messages.map((message) => {
          const displayName = message.senderName || "Anonymous";
          return (
            <Card
              key={message.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                selectedMessage?.id === message.id
                  ? "border-primary"
                  : message.readAt
                  ? "border-muted"
                  : "border-l-4 border-l-primary"
              }`}
              onClick={() => onSelectMessage(message)}
            >
              <CardContent className="p-3">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    {displayName !== "Anonymous" ? (
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-primary" />
                        <span className="font-medium">{displayName}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <UserX className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Anonymous</span>
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">{formatDate(message.createdAt)}</span>
                </div>
                {message.parent ? (
                  <div className="text-xs italic text-gray-500 border-l pl-2 mb-2">
                    In reply to: {message.parent.content} <br />
                    ({new Date(message.parent.createdAt).toLocaleString()})
                  </div>
                ) : message.parentId ? (
                  <div className="text-xs italic text-gray-500 border-l pl-2 mb-2">
                    In reply to: Parent message not available
                  </div>
                ) : null}
                <p className="text-sm mt-2 line-clamp-2">{message.content}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Message Detail */}
      <div className="md:col-span-2">
        {selectedMessage ? (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">
                    {selectedMessage.senderName ? (
                      <span>From: {selectedMessage.senderName}</span>
                    ) : (
                      <span className="text-muted-foreground">Anonymous Message</span>
                    )}
                  </CardTitle>
                  <CardDescription>
                    Received on {new Date(selectedMessage.createdAt).toLocaleString()}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <Separator />
            <CardContent className="pt-4">
              {selectedMessage.parent ? (
                <div className="text-xs italic text-gray-500 border-l pl-2 mb-2">
                  In reply to: {selectedMessage.parent.content} <br />
                  ({new Date(selectedMessage.parent.createdAt).toLocaleString()})
                </div>
              ) : selectedMessage.parentId ? (
                <div className="text-xs italic text-gray-500 border-l pl-2 mb-2">
                  In reply to: Parent message not available
                </div>
              ) : null}
              <div className="prose prose-sm max-w-none">
                <p>{selectedMessage.content}</p>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              {onReply && (
                <Button variant="outline" size="sm" onClick={() => onReply(selectedMessage)} className="gap-2">
                  <Reply className="h-4 w-4" />
                  Reply
                </Button>
              )}
              {onDelete && (
                <Button variant="destructive" size="sm" onClick={() => onDelete(selectedMessage)} className="gap-2">
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              )}
            </CardFooter>
          </Card>
        ) : (
          <Card className="border-dashed h-full flex items-center justify-center">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="rounded-full bg-muted p-3">
                <MessageSquare className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">Select a message</h3>
              <p className="text-sm text-muted-foreground text-center max-w-sm mt-2">
                Choose a message from the list to view its contents.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
