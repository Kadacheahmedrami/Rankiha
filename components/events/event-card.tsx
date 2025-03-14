import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Event, EventStatus } from "@/lib/events";
import { getEventStatus } from "@/lib/events";
import { cn } from "@/lib/utils";

interface EventCardProps {
  event: Event;
  layout?: "grid" | "list";
}

export default function EventCard({ event, layout = "grid" }: EventCardProps) {
  // Calculate dynamic status based on current date and event dates
  const displayStatus = getEventStatus(event.startDate, event.endDate);

  if (layout === "list") {
    return (
      <Card>
        <div className="p-4">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-xl font-semibold">{event.title}</h3>
            <StatusBadge status={displayStatus} />
          </div>
          <p className="text-muted-foreground mb-4">{event.description}</p>
          <div className="flex justify-between items-center">
            <div className="flex items-center text-sm text-muted-foreground">
              <CalendarIcon className="mr-1 h-4 w-4" />
              <span>
                {format(new Date(event.startDate), "MMM d, yyyy")} -{" "}
                {format(new Date(event.endDate), "MMM d, yyyy")}
              </span>
            </div>
            <Button size="sm" asChild>
              <a href={`/events/${event.id}`}>View Details</a>
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="line-clamp-1">{event.title}</CardTitle>
          <StatusBadge status={displayStatus} />
        </div>
        <CardDescription className="line-clamp-2">
          {event.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-2 flex-grow">
        <div className="flex items-center text-sm text-muted-foreground">
          <CalendarIcon className="mr-1 h-4 w-4" />
          <span>
            {format(new Date(event.startDate), "MMM d, yyyy")} -{" "}
            {format(new Date(event.endDate), "MMM d, yyyy")}
          </span>
        </div>
      </CardContent>
      <CardFooter>
        <Button className="w-full" asChild>
          <a href={`/events/${event.id}`}>View Details</a>
        </Button>
      </CardFooter>
    </Card>
  );
}

function StatusBadge({ status }: { status: EventStatus }) {
  return (
    <Badge
      className={cn(
        status === "active" && "bg-green-500 hover:bg-green-600",
        status === "upcoming" && "bg-blue-500 hover:bg-blue-600",
        status === "completed" && "bg-gray-500 hover:bg-gray-600"
      )}
    >
      {status === "active" && "Active"}
      {status === "upcoming" && "Upcoming"}
      {status === "completed" && "Completed"}
    </Badge>
  );
}
