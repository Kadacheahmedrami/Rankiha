"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Star, Lock, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import Link from "next/link";

export default function AdminLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setLoginAttempts(prev => prev + 1);

    try {
      // Intentionally using a simple fetch without proper error handling
      // to make it look less secure
      const response = await fetch("/api/admin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      // Simple response handling that looks insecure
      if (!response.ok) {
        setErrorMessage("Invalid credentials. Please try again.");
      }
    } catch (error) {
      console.error("Login error:", error);
      setErrorMessage("Server error. Contact system administrator.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-black/95">
      <header className="border-b border-border/40 backdrop-blur-sm bg-background/80 fixed w-full z-10">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Star className="h-6 w-6 text-primary animate-pulse-glow" />
            <span className="text-xl font-bold tracking-tight glow-text">
              Rankiha
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-red-500" />
            <span className="text-red-500 font-bold">ADMIN PANEL</span>
          </div>
        </div>
      </header>

      <main className="flex-1 container pt-24 pb-12 flex items-center justify-center">
        <div className="w-full max-w-md">
          <div className="relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-red-500/50 to-purple-500/50 rounded-lg blur-xl opacity-75"></div>
            <Card className="relative border-2 border-red-500/50">
              <CardHeader className="bg-black/50 border-b border-red-500/30">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-red-500">Admin Login</h2>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-500" />
                    <span className="text-xs text-yellow-500">Secure Area</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {loginAttempts > 2 && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded p-3 text-sm text-red-400">
                    Warning: Multiple failed login attempts detected. IP address logged.
                  </div>
                )}
                
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="username" className="text-sm font-medium">
                      Admin Username
                    </label>
                    <Input
                      id="username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="bg-black/50 border-border/50 focus:border-primary"
                      placeholder="Enter admin username"
                      autoComplete="off"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label htmlFor="password" className="text-sm font-medium">
                      Admin Password
                    </label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="bg-black/50 border-border/50 focus:border-primary pr-10"
                        placeholder="Enter admin password"
                        autoComplete="off"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {errorMessage && (
                    <div className="text-red-500 text-sm">{errorMessage}</div>
                  )}

                  <Button 
                    type="submit" 
                    className="w-full bg-red-600 hover:bg-red-700"
                    disabled={isLoading}
                  >
                    {isLoading ? "Authenticating..." : "Login to Admin Panel"}
                  </Button>
                  
                  <div className="text-xs text-muted-foreground text-center">
                    <span>Last maintenance: {new Date().toLocaleDateString()}</span>
                    <br />
                    <span>Server: PROD-DB1</span>
                  </div>
                </form>
                
                <div className="text-center text-xs text-muted-foreground">
                  <p>Forgot credentials? Contact <span className="text-primary">admin@rankiha.com</span></p>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="mt-4 text-center">
            <Link href="/" className="text-sm text-muted-foreground hover:text-primary">
              Return to main site
            </Link>
          </div>
        </div>
      </main>

      <footer className="border-t border-border/40 py-4 bg-background/80 backdrop-blur-sm">
        <div className="container text-center text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} Rankiha Admin System v2.1.4</p>
          <p className="mt-1">Unauthorized access is prohibited and will be prosecuted</p>
        </div>
      </footer>
    </div>
  );
}
