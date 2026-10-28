"use client";

import { CreditCard, LogIn, Sparkles } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/AuthContext";

export function LandingNavbar() {
  const { isAuthenticated, user, openLogin, openRegister } = useAuth();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/70 bg-background/80 backdrop-blur-xl transition-all">
      <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <Link
          href="/"
          className="flex items-center gap-2.5 group active:scale-95 transition-transform"
        >
          <div className="flex size-9.5 items-center justify-center rounded-xl bg-gradient-to-br from-primary/25 via-primary/15 to-primary/5 text-primary border border-primary/25 shadow-2xs group-hover:scale-105 transition-transform duration-200">
            <CreditCard className="size-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-base font-bold tracking-tight text-foreground leading-none">
              FreelanceFin
            </span>
            <span className="text-[10px] font-medium text-muted-foreground">
              Vakman & ZZP
            </span>
          </div>
        </Link>

        {/* Center Nav Links */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-muted-foreground">
          <a
            href="#features"
            className="hover:text-foreground transition-colors"
          >
            Wat kun je doen?
          </a>
          <a
            href="#how-it-works"
            className="hover:text-foreground transition-colors"
          >
            Hoe het werkt
          </a>
          {isAuthenticated && (
            <Link
              href="/dashboard"
              className="hover:text-foreground transition-colors"
            >
              Dashboard
            </Link>
          )}
        </nav>

        {/* Auth CTA Actions */}
        <div className="flex items-center gap-2.5">
          {isAuthenticated ? (
            <div className="flex items-center gap-2.5">
              <span className="hidden sm:inline-block text-xs font-medium text-muted-foreground truncate max-w-[160px]">
                {user?.email}
              </span>
              <Button
                size="sm"
                asChild
                className="rounded-full px-4 text-xs font-semibold shadow-xs"
              >
                <Link href="/dashboard">Dashboard</Link>
              </Button>
            </div>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={openLogin}
                className="rounded-full text-xs font-semibold cursor-pointer text-muted-foreground hover:text-foreground"
              >
                <LogIn className="size-3.5 mr-1.5" />
                <span>Inloggen</span>
              </Button>
              <Button
                size="sm"
                onClick={openRegister}
                className="rounded-full text-xs font-semibold px-4 shadow-xs cursor-pointer"
              >
                <Sparkles className="size-3.5 mr-1.5" />
                <span>Account maken</span>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
