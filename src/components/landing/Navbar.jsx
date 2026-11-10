"use client";

import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/AuthContext";
import { cn } from "@/lib/utils";

export function LandingNavbar() {
  const { isAuthenticated, user, openLogin, openRegister } = useAuth();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/70 bg-background/80 backdrop-blur-xl transition-all">
      <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <Link href="/" className="flex items-center">
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
              <Link
                href="/dashboard"
                className={cn(
                  buttonVariants({ size: "sm" }),
                  "rounded-full px-4 text-xs font-semibold shadow-xs",
                )}
              >
                Dashboard
              </Link>
            </div>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={openLogin}
                className="rounded-full text-xs font-semibold cursor-pointer text-muted-foreground hover:text-foreground"
              >
                <span>Inloggen</span>
              </Button>
              <Button
                size="sm"
                onClick={openRegister}
                className="rounded-full text-xs font-semibold px-4 shadow-xs cursor-pointer"
              >
                <span>Account maken</span>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
