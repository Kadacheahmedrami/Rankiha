// File: app/auth/error/page.tsx

"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, AlertCircle } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function ErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  let errorMessage = "An unexpected error occurred";

  if (error === "AccessDenied") {
    errorMessage = "You don't have access to this application.";
  } else if (error === "Verification") {
    errorMessage = "The sign in link is no longer valid.";
  } else if (error === "OAuthSignin" || error === "OAuthCallback" || error === "OAuthCreateAccount") {
    errorMessage = "There was a problem with the Google sign-in process.";
  }

  return (
    <Card className="border-border/50 overflow-hidden">
      <div className="absolute -inset-0.5 bg-gradient-to-r from-red-500/30 to-orange-500/30 rounded-lg blur-md opacity-50"></div>
      <CardHeader className="relative space-y-1">
        <CardTitle className="text-2xl text-center flex items-center justify-center gap-2">
          <AlertCircle className="h-6 w-6 text-red-500" />
          Authentication Error
        </CardTitle>
        <CardDescription className="text-center">Something went wrong</CardDescription>
      </CardHeader>
      <CardContent className="relative space-y-4">
        <div className="p-4 border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900/50 rounded-md text-red-800 dark:text-red-200">
          {errorMessage}
        </div>
      </CardContent>
      <CardFooter className="relative flex justify-center">
        <Link href="/auth/signin">
          <Button>Try Again</Button>
        </Link>
      </CardFooter>
    </Card>
  );
}

export default function ErrorPage() {
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
        <Suspense 
          fallback={
            <Card className="border-border/50">
              <CardContent className="flex items-center justify-center h-40">
                <div className="animate-pulse">Loading...</div>
              </CardContent>
            </Card>
          }
        >
          <ErrorContent />
        </Suspense>
      </div>
    </div>
  );
}