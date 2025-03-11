"use client";

import type React from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { usePathname, useRouter } from "next/navigation"; // Added useRouter for back button
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Bell,
  LogOut,
  Menu,
  ArrowLeft, // Added ArrowLeft for the back button
  MessageCircle,
  Settings,
  Star,
  TrendingUp,
  User,
  Calendar,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { signOut } from "next-auth/react";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  // Map the pathname to a corresponding title
  const getTitle = () => {
    if (pathname.includes("/profile")) return "Profile";
    if (pathname.includes("/leaderboard")) return "Leaderboard";
    if (pathname.includes("/events")) return "Events";
    if (pathname.includes("/feed")) return "Feed";
    return "Dashboard"; // Default title
  };

  const navItems = [
    { name: "Leaderboard", href: "/leaderboard", icon: <TrendingUp className="h-5 w-5" /> },
    { name: "Profile", href: "/profile", icon: <User className="h-5 w-5" /> },
    { name: "Feed", href: "/feed", icon: <MessageCircle className="h-5 w-5" /> },
    { name: "Events", href: "/events", icon: <Calendar className="h-5 w-5" /> },
  ];

  const handleSignOut = () => {
    signOut({ callbackUrl: "/" });
  };

  const isProfilePage = pathname.includes("/profile");

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border/40 backdrop-blur-sm bg-background/80 fixed w-full z-10">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
          <div className="border-b hidden md:block border-border/40 p-4">
              
                  </div>
            {/* Back Button for Profile Page (Mobile Only) */}
            {isProfilePage ? (
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => router.back()}
            >
              <ArrowLeft className="h-5 w-5" /> {/* Smaller size */}
              <span className="sr-only">Go back</span>
            </Button>
          ) : ( 
              <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="md:hidden">
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Toggle menu</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0">
                  <div className="flex flex-col h-full">
                    <div className="border-b border-border/40 p-4">
                      <div className="flex items-center gap-2">
                  
                   
                      </div>
                    </div>
                    <nav className="flex-1 p-4">
                      <ul className="space-y-2">
                        {navItems.map((item) => (
                          <li key={item.name}>
                            <Link
                              href={item.href}
                              className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-secondary transition-colors"
                              onClick={() => setIsMobileMenuOpen(false)}
                            >
                              {item.icon}
                              <span>{item.name}</span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </nav>
                    <div className="border-t border-border/40 p-4">
                      <Button
                        variant="ghost"
                        className="w-full justify-start gap-3"
                        onClick={() => {
                          setIsMobileMenuOpen(false);
                          handleSignOut();
                        }}
                      >
                        <LogOut className="h-5 w-5" />
                        <span>Sign Out</span>
                      </Button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            )}

            {!isProfilePage && (
              <Link href="/leaderboard" className="flex items-center gap-2">
                <Star className="h-6 w-6 text-primary" />
                <span className="text-xl font-bold tracking-tight hidden md:inline">Rankiha</span>
              </Link>
            )}
          </div>

          {/* Dynamic Heading */}
          <h1 className="text-2xl md:hidden mr-auto sm:text-3xl font-bold tracking-tight glow-text bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-500">
            {getTitle()}
          </h1>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link key={item.name} href={item.href}>
                <Button variant="ghost" className="gap-2">
                  {item.icon}
                  <span>{item.name}</span>
                </Button>
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="/placeholder-user.jpg" alt="@user" />
                    <AvatarFallback>
                      <User className="h-6 w-6 transition-transform duration-200 ease-in-out hover:scale-110" />
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/leaderboard" className="cursor-pointer">
                    <TrendingUp className="mr-2 h-4 w-4" />
                    <span>Leaderboard</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/feed" className="cursor-pointer">
                    <MessageCircle className="mr-2 h-4 w-4" />
                    <span>Feed</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/events" className="cursor-pointer">
                    <Calendar className="mr-2 h-4 w-4" />
                    <span>Events</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="flex-1 md:container pt-24 pb-12">{children}</main>
    </div>
  );
}
