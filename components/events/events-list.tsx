"use client";
import { useState, useMemo } from "react";
import { FilterIcon, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import EventCard from "./event-card";
import type { Event, EventStatus } from "@/lib/events";
import { getEventStatus } from "@/lib/events";

export default function EventsList({
  initialEvents,
}: {
  initialEvents: Event[];
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<EventStatus | "all">("all");
  const [sortBy, setSortBy] = useState<"date" | "title">("date");

  const filteredAndSortedEvents = useMemo(() => {
    return initialEvents
      .filter((event) => {
        const matchesSearch =
          event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (event.description || "")
            .toLowerCase()
            .includes(searchQuery.toLowerCase());

        // Calculate dynamic status
        const dynamicStatus = getEventStatus(event.startDate, event.endDate);

        const matchesFilter =
          activeFilter === "all" || dynamicStatus === activeFilter;

        return matchesSearch && matchesFilter;
      })
      .sort((a, b) => {
        if (sortBy === "date") {
          return (
            new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
          );
        } else {
          return a.title.localeCompare(b.title);
        }
      });
  }, [initialEvents, searchQuery, activeFilter, sortBy]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:w-72">
          <Input
            placeholder="Search events..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
          <div className="absolute left-3 top-1/2 -translate-y-1/2">
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
              className="text-muted-foreground"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9">
                <FilterIcon className="mr-2 h-4 w-4" />
                Filter
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setActiveFilter("all")}>
                All Events
                {activeFilter === "all" && <span className="ml-auto">✓</span>}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActiveFilter("active")}>
                Active Events
                {activeFilter === "active" && (
                  <span className="ml-auto">✓</span>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActiveFilter("upcoming")}>
                Upcoming Events
                {activeFilter === "upcoming" && (
                  <span className="ml-auto">✓</span>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActiveFilter("completed")}>
                Completed Events
                {activeFilter === "completed" && (
                  <span className="ml-auto">✓</span>
                )}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9">
                <ArrowUpDown className="mr-2 h-4 w-4" />
                Sort by: {sortBy === "date" ? "Date" : "Title"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setSortBy("date")}>
                Date
                {sortBy === "date" && <span className="ml-auto">✓</span>}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy("title")}>
                Title
                {sortBy === "title" && <span className="ml-auto">✓</span>}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Tabs defaultValue="grid" className="w-full">
        <div className="flex justify-end mb-4">
          <TabsList>
            <TabsTrigger value="grid">Grid</TabsTrigger>
            <TabsTrigger value="list">List</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="grid" className="mt-0">
          {filteredAndSortedEvents.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-muted-foreground">
                    No events found matching your criteria.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredAndSortedEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="list" className="mt-0">
          {filteredAndSortedEvents.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-muted-foreground">
                    No events found matching your criteria.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredAndSortedEvents.map((event) => (
                <EventCard key={event.id} event={event} layout="list" />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
