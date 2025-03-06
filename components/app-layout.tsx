"use client"

import type React from "react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Bell, LogOut, Menu, Settings, Star, TrendingUp, User } from 'lucide-react'
import Link from "next/link"
import { useState } from "react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const navItems = [
    { name: "Leaderboard", href: "/leaderboard", icon: <TrendingUp className="h-5 w-5" /> },
    { name: "Profile", href: "/profile", icon: <User className="h-5 w-5" /> },
  ]

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border/40 backdrop-blur-sm bg-background/80 fixed w-full z-10">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
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
                      <Star className="h-6 w-6 text-primary" />
                      <span className="text-xl font-bold tracking-tight">Stellar Ranks</span>
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
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <LogOut className="h-5 w-5" />
                      <span>Sign Out</span>
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            <Link href="/leaderboard" className="flex items-center gap-2">
              <Star className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold tracking-tight hidden md:inline">Stellar Ranks</span>
            </Link>
          </div>

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
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full"></span>
              <span className="sr-only">Notifications</span>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="/placeholder-user.jpg" alt="@user" />
                    <AvatarFallback>U</AvatarFallback>
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
                  <Link href="/settings" className="cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="flex-1 container pt-24 pb-12">{children}</main>
    </div>
  )
}
