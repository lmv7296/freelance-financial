import { CreditCard } from "lucide-react";
import Link from "next/link";

export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4 sm:p-6 bg-radial from-background via-muted/30 to-background">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5 group active:scale-95 transition-transform"
          >
            <div className="flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 text-primary border border-primary/25 shadow-xs transition-transform duration-200 group-hover:scale-105">
              <CreditCard className="size-6" />
            </div>
            <span className="text-xl font-bold tracking-tight text-foreground">
              FreelanceFin
            </span>
          </Link>
          <p className="text-xs text-muted-foreground">
            Financiële rust voor de zelfstandige vakman & ondernemer
          </p>
        </div>

        {/* Auth Box */}
        <div className="w-full rounded-2xl bg-card border border-border/70 shadow-xl p-6 sm:p-8 backdrop-blur-md">
          {children}
        </div>

        {/* Back to dashboard */}
        <div className="text-center">
          <Link
            href="/dashboard"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Terug naar dashboard overzicht
          </Link>
        </div>
      </div>
    </div>
  );
}
