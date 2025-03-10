import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Star } from "lucide-react"
import Link from "next/link"

interface ProfileCardProps {
  profile: {
    id: number
    name: string
    username: string
    rating: number
    ratings: number
  }
}

export default function ProfileCard({ profile }: ProfileCardProps) {
  return (
    <Card className="overflow-hidden hover:shadow-glow-sm transition-all duration-300">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-r from-primary/30 to-purple-500/30 flex items-center justify-center">
            <span className="font-bold text-lg">{profile.name.charAt(0)}</span>
          </div>
          <div className="flex-1">
            <h3 className="font-medium">{profile.name}</h3>
            <p className="text-sm text-muted-foreground">{profile.username}</p>
            <div className="flex items-center gap-1 mt-1">
              <span className="font-bold">{profile.rating}</span>
              <div className="flex">
                {Array(5)
                  .fill(0)
                  .map((_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${i < Math.floor(profile.rating) ? "text-yellow-400 fill-current" : "text-muted-foreground"}`}
                    />
                  ))}
              </div>
              <span className="text-xs text-muted-foreground">({profile.ratings})</span>
            </div>
          </div>
          <Link href={`/profile/${profile.id}`}>
            <Button variant="outline" size="sm" className="glow-effect">
              View
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}

