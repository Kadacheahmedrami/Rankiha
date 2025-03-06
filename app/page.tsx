import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import Link from "next/link"
import { ArrowRight, Star } from "lucide-react"

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border/40 backdrop-blur-sm bg-background/80 fixed w-full z-10">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Star className="h-6 w-6 text-primary animate-pulse-glow" />
            <span className="text-xl font-bold tracking-tight glow-text">Stellar Ranks</span>
          </div>
          <Link href="/auth/signin">
            <Button className="glow-button">
              Sign In
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </header>

      <main className="flex-1 container pt-24 pb-12">
        <div className="grid gap-6 lg:grid-cols-2 lg:gap-12 items-center">
          <div className="space-y-4 animate-fade-in">
            <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl glow-text">
              Discover & Rate <br />
              <span className="text-primary">Outstanding Profiles</span>
            </h1>
            <p
              className="text-muted-foreground text-lg max-w-[600px] animate-slide-up"
              style={{ animationDelay: "0.2s" }}
            >
              Join our platform to search, rate, and discover top-ranked users in real-time. Connect with Google and
              start your journey today.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-4 animate-slide-up" style={{ animationDelay: "0.4s" }}>
              <Link href="/auth/signin">
                <Button size="lg" className="glow-button">
                  Get Started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/leaderboard">
                <Button variant="outline" size="lg" className="glow-effect">
                  View Leaderboard
                </Button>
              </Link>
            </div>
          </div>

          <div className="relative animate-fade-in" style={{ animationDelay: "0.3s" }}>
            <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/50 to-purple-500/50 rounded-lg blur-xl opacity-75"></div>
            <Card className="relative overflow-hidden border-2 border-border/50">
              <CardContent className="p-6">
                <div className="space-y-8">
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold">Top Rated Profiles</h3>
                    <div className="h-[1px] w-full bg-gradient-to-r from-primary/80 to-transparent"></div>
                  </div>

                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="flex items-center gap-4 p-3 rounded-lg bg-secondary/50 hover:bg-secondary/80 transition-all"
                    >
                      <div className="w-12 h-12 rounded-full bg-gradient-to-r from-primary/30 to-purple-500/30 flex items-center justify-center">
                        <span className="font-bold text-lg">{i}</span>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium">Profile Name {i}</h4>
                        <div className="flex items-center gap-1 text-yellow-400">
                          {Array(5)
                            .fill(0)
                            .map((_, j) => (
                              <Star key={j} className={`h-4 w-4 ${j < (6 - i) ? "fill-current" : "opacity-40"}`} />
                            ))}
                          <span className="text-xs text-muted-foreground ml-2">{(6 - i).toFixed(1)} / 5.0</span>
                        </div>
                      </div>
                    </div>
                  ))}

                  <div className="text-center">
                    <Link href="/leaderboard">
                      <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80">
                        View All Rankings
                        <ArrowRight className="ml-1 h-3 w-3" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="mt-24 space-y-12">
          <h2 className="text-3xl font-bold text-center glow-text">How It Works</h2>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: "Sign In",
                description: "Connect with your Google account for a seamless experience",
                delay: "0s",
                icon: "🔐",
              },
              {
                title: "Discover Profiles",
                description: "Search and explore profiles from our growing community",
                delay: "0.2s",
                icon: "🔍",
              },
              {
                title: "Rate & Rank",
                description: "Give ratings and see real-time updates on the leaderboard",
                delay: "0.4s",
                icon: "⭐",
              },
            ].map((item, i) => (
              <Card
                key={i}
                className="glow-effect overflow-hidden animate-slide-up"
                style={{ animationDelay: item.delay }}
              >
                <CardContent className="p-6 space-y-4">
                  <div className="text-4xl">{item.icon}</div>
                  <h3 className="text-xl font-semibold">{item.title}</h3>
                  <p className="text-muted-foreground">{item.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>

      <footer className="border-t border-border/40 py-6 bg-background/80 backdrop-blur-sm">
        <div className="container flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Star className="h-5 w-5 text-primary" />
            <span className="font-semibold">Stellar Ranks</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Stellar Ranks. All rights reserved.
          </p>
          <div className="flex gap-4">
            <Link href="/terms" className="text-sm text-muted-foreground hover:text-foreground">
              Terms
            </Link>
            <Link href="/privacy" className="text-sm text-muted-foreground hover:text-foreground">
              Privacy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

