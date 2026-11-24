"use client";

import Link from "next/link";
import { useT } from "@/lib/preferences/PreferencesContext";

export default function AuthLayout({ children }) {
  const t = useT();

  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4 sm:p-6 bg-background">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <Link
            href="/"
            className="text-xl font-bold tracking-tight text-foreground"
          >
            FreelanceFin
          </Link>
          <p className="text-xs text-muted-foreground">
            {t("authLayout.tagline")}
          </p>
        </div>

        {/* Auth Box */}
        <div className="w-full rounded-2xl bg-card border border-border/70 shadow-xl p-6 sm:p-8">
          {children}
        </div>

        <div className="text-center">
          <Link
            href="/"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {t("authLayout.back")}
          </Link>
        </div>
      </div>
    </div>
  );
}
