import { ArrowUpRight, CheckCircle2, Sparkles, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/**
 * Apple Design + Material 3 Fusion Metric Card
 * Features:
 * - Translucent glassmorphic depth (`backdrop-blur-md bg-card/90`)
 * - Specular rim border (`border-border/70 dark:border-white/[0.08]`)
 * - Instant pointer-down press feedback (`active:scale-[0.985]`)
 * - Dual-stop gradient icon pod
 * - Optical typography with tabular numerals (`tabular-nums font-mono`)
 */
export function FluidMaterialMetricCard({
  title = "Netto Omzet",
  description = "Afgelopen 30 dagen • 18 klussen voldaan",
  value = "€14.820,00",
  trend = "+18.2%",
  trendLabel = "t.o.v. vorige maand",
  icon = <Sparkles className="size-5" />,
  badge = "Geverifieerd",
  onAction,
}) {
  return (
    <Card className="rounded-2xl border border-border/70 bg-card/90 backdrop-blur-md shadow-xs hover:-translate-y-1 hover:shadow-lg hover:border-border/90 active:scale-[0.99] transition-all duration-300 ease-out select-none">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="flex items-center gap-3">
          {icon && (
            <div className="flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 text-primary border border-primary/25 shadow-xs">
              {icon}
            </div>
          )}
          <div>
            <CardTitle className="text-sm font-bold text-foreground tracking-tight">
              {title}
            </CardTitle>
            {description && (
              <CardDescription className="text-xs text-muted-foreground/80 mt-0.5">
                {description}
              </CardDescription>
            )}
          </div>
        </div>

        {badge && (
          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
            <CheckCircle2 className="size-3 text-emerald-600 dark:text-emerald-400" />
            {badge}
          </span>
        )}
      </CardHeader>

      <CardContent className="pt-1 pb-3">
        {/* Tabular Numerals for Jitter-Free Financial Figures */}
        <p className="text-3xl font-extrabold tracking-tight text-foreground font-mono tabular-nums">
          {value}
        </p>

        {trend && (
          <div className="mt-2.5 flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
              <TrendingUp className="size-3.5" />
              {trend}
            </span>
            {trendLabel && (
              <span className="text-xs text-muted-foreground font-medium">
                {trendLabel}
              </span>
            )}
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-2 pb-4 border-t border-border/40 flex justify-end gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="rounded-full text-xs font-semibold hover:bg-muted active:scale-[0.97] transition-all px-4 cursor-pointer"
        >
          Details
        </Button>
        <Button
          size="sm"
          onClick={onAction}
          className="rounded-full text-xs font-semibold shadow-xs hover:shadow-sm active:scale-[0.97] transition-all px-4 cursor-pointer"
        >
          Export <ArrowUpRight className="size-3.5 ml-1" />
        </Button>
      </CardFooter>
    </Card>
  );
}

/**
 * Apple Fluid Motion Physics Helper Utilities:
 * Ready to use with Framer Motion, Motion One, or Pointer Events.
 */

// 1. Asymptotic Rubber-Banding Formula (Apple HIG on Web)
export function rubberband(overshoot, dimension, constant = 0.55) {
  return (
    (overshoot * dimension * constant) /
    (dimension + constant * Math.abs(overshoot))
  );
}

// 2. Exponential Momentum Projection Formula
export function projectMomentum(initialVelocity, decelerationRate = 0.998) {
  return ((initialVelocity / 1000) * decelerationRate) / (1 - decelerationRate);
}

// 3. Apple Spring Configuration Presets (Motion / Framer Motion)
export const APPLE_SPRING_PRESETS = {
  // Critically damped default: zero bounce, smooth rapid settle
  default: { type: "spring", bounce: 0, duration: 0.35 },
  // Interactive modal / drawer: subtle settle
  sheet: { type: "spring", bounce: 0.15, duration: 0.3 },
  // High-momentum flick or throw: physical follow-through
  flick: { type: "spring", bounce: 0.25, duration: 0.4 },
};
