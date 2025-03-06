"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Star } from "lucide-react"
import Link from "next/link"
import { signIn } from "next-auth/react"
import { useState } from "react"
import { FcGoogle } from "react-icons/fc"

export default function SignInPage() {
  const [isLoading, setIsLoading] = useState(false)

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true)
      await signIn("google", { callbackUrl: "/leaderboard" })
    } catch (error) {
      console.error("Sign in error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-background via-background to-background/90">
      <div className="absolute top-4 left-4 sm:top-8 sm:left-8">
        <Link href="/">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Button>
        </Link>
      </div>

      <div className="w-full max-w-md animate-fade-in">
        <div className="flex justify-center mb-6">
          <div className="flex items-center gap-2">
            <Star className="h-8 w-8 text-primary animate-pulse-glow" />
            <span className="text-2xl font-bold tracking-tight glow-text">Stellar Ranks</span>
          </div>
        </div>

        <Card className="border-border/50 overflow-hidden">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/30 to-purple-500/30 rounded-lg blur-md opacity-50"></div>
          <CardHeader className="relative space-y-1">
            <CardTitle className="text-2xl text-center">Sign In</CardTitle>
            <CardDescription className="text-center">Connect with your Google account to continue</CardDescription>
          </CardHeader>
          <CardContent className="relative space-y-4 pb-0">
            <div className="flex justify-center py-6">
              <Button
                variant="outline"
                size="lg"
                className="w-full relative overflow-hidden glow-effect"
                onClick={handleGoogleSignIn}
                disabled={isLoading}
              >
                <FcGoogle className="mr-2 h-5 w-5" />
                {isLoading ? "Signing in..." : "Sign in with Google"}
              </Button>
            </div>
          </CardContent>
          <CardFooter className="relative flex flex-col space-y-4 pt-0">
            <div className="relative flex items-center justify-center w-full py-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border/50"></div>
              </div>
              <div className="relative bg-card px-4 text-sm text-muted-foreground">
                By continuing, you agree to our Terms
              </div>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}

