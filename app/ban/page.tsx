import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Ban, Mail, AlertTriangle } from "lucide-react"
import Link from "next/link"

export default function BannedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-background to-secondary/20">
      <Card className="max-w-md w-full border-0 shadow-xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 to-red-600/10 rounded-xl"></div>

        <CardHeader className="relative space-y-1 pb-6">
          <div className="mx-auto bg-red-500/20 w-16 h-16 rounded-full flex items-center justify-center mb-2">
            <Ban className="h-8 w-8 text-red-500" />
          </div>
          <CardTitle className="text-2xl font-bold text-center">Account Suspended</CardTitle>
          <CardDescription className="text-center text-base">
            Your account has been banned for policy violations
          </CardDescription>
        </CardHeader>

        <CardContent className="relative space-y-4">
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
            <div className="flex gap-3">
              <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium mb-1">Reason for suspension:</h3>
                <p className="text-sm text-muted-foreground">
                  Your account has been suspended due to malpractice that violates our platform's terms of service and
                  community guidelines.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="font-medium">What can you do?</h3>
            <p className="text-sm text-muted-foreground">
              If you believe this decision was made in error, please contact our technical support team for assistance.
              Our team will review your case and respond as soon as possible.
            </p>
          </div>
        </CardContent>

        <CardFooter className="relative flex flex-col sm:flex-row gap-3 pt-2">
          <Button
            className="w-full sm:w-auto gap-2 bg-gradient-to-r from-primary to-purple-500 hover:from-primary/90 hover:to-purple-500/90"
            asChild
          >
            <Link href="mailto:support@example.com">
              <Mail className="h-4 w-4" />
              Contact Support
            </Link>
          </Button>
          <Button variant="outline" className="w-full sm:w-auto" asChild>
            <Link href="/">Return to Home</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

