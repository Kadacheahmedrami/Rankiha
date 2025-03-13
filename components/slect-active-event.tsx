"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { format } from "date-fns"
import { CalendarIcon, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/use-toast"

type Event = {
  id: string
  title: string
  description: string
  startDate: string
  endDate: string
}

export default function ActiveEventToast() {
  const [activeEvent, setActiveEvent] = useState<Event | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const toastShownRef = useRef(false)

  useEffect(() => {
    async function fetchActiveEvent() {
      try {
        const res = await fetch("/api/events/slect-active-event")
        if (res.ok) {
          const json = await res.json()
          // Expecting the API to return { data: activeEvent }
          if (json.data) {
            setActiveEvent(json.data)
          }
        } else {
          console.error("No active event found")
        }
      } catch (error) {
        console.error("Error fetching active event:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchActiveEvent()
  }, [])

  useEffect(() => {
    if (!loading && activeEvent && !toastShownRef.current) {
      toastShownRef.current = true
      toast({
        title: "active event",
    
        description: (
            
          <div className="bg-purple-500  text-white p-5 mt-2 rounded-lg shadow-xl">
            <h1 className="text-[22px] my-2 font-bold">{activeEvent.title}</h1>
            <p className="line-clamp-2 text-sm mb-3">{activeEvent.description}</p>
        
            <div className="mt-5">
              <Link href={`/events/${activeEvent.id}`}>
                <Button
                  variant="outline"
                  className="text-white border-white hover:bg-white hover:text-purple-700 transition-all"
                >
                  View Event <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        ),
      })
    }
  }, [loading, activeEvent])

  return null
}

