import { CreditCard } from "lucide-react";
import { cacheLife } from "next/cache";
import Link from "next/link";

export function LandingFooter() {
  return (
    <footer className="border-t border-border/60 bg-muted/20 text-muted-foreground text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <CreditCard className="size-4" />
          </div>
          <span className="font-bold text-foreground">FreelanceFin</span>
          <span className="text-[11px] opacity-70">
            — Financieel beheer voor vakmensen & zelfstandigen.
          </span>
        </div>

        <div className="flex items-center gap-4 text-[11px]">
          <Link
            href="/dashboard"
            className="hover:text-foreground transition-colors"
          >
            Dashboard
          </Link>
          <Link
            href="/login"
            className="hover:text-foreground transition-colors"
          >
            Inloggen
          </Link>
          <Link
            href="/register"
            className="hover:text-foreground transition-colors"
          >
            Registreren
          </Link>
        </div>

        <p className="text-[10px] opacity-60">
          © <CopyrightYear /> FreelanceFin. Alle rechten voorbehouden.
        </p>
      </div>
    </footer>
  );
}

// The year is captured into the static shell and refreshed daily, so it
// rolls over on its own without making the landing page dynamic.
async function CopyrightYear() {
  "use cache";
  cacheLife("days");
  return new Date().getFullYear();
}
