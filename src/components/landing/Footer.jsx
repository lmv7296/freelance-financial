"use client";

import Link from "next/link";
import { useT } from "@/lib/preferences/PreferencesContext";

export function LandingFooter() {
  const t = useT();

  return (
    <footer className="border-t border-border/60 bg-muted/20 text-muted-foreground text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="font-bold text-foreground">FreelanceFin</span>
          <span className="text-[11px] opacity-70">
            — {t("landing.footer.tagline")}
          </span>
        </div>

        <div className="flex items-center gap-4 text-[11px]">
          <Link
            href="/dashboard"
            className="hover:text-foreground transition-colors"
          >
            {t("landing.footer.dashboard")}
          </Link>
          <Link
            href="/login"
            className="hover:text-foreground transition-colors"
          >
            {t("landing.footer.login")}
          </Link>
          <Link
            href="/register"
            className="hover:text-foreground transition-colors"
          >
            {t("landing.footer.register")}
          </Link>
        </div>

        <p className="text-[10px] opacity-60">
          {t("landing.footer.copyright", { year: new Date().getFullYear() })}
        </p>
      </div>
    </footer>
  );
}
