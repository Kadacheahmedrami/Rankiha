import { redirect } from "next/navigation"

export default function ProfileRedirect() {
  // Redirect to the search page since we don't have a user ID yet
  redirect("/search")
}

