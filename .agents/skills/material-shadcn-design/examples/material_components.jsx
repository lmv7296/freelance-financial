import { ArrowUpRight, TrendingUp } from "lucide-react";
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
 * Material Design 3 + HeroUI Fusion Metric Card
 * Features:
 * - Radiant glassmorphic card with subtle border & hover lift
 * - Vibrant gradient-tinted icon pod
 * - Modern capsule trend chip
 * - Punchy typography and pill CTA buttons
 */
export function HeroMaterialMetricCard({
  title = "Net Income",
  description = "Past 30 days summary",
  value = "$14,820.00",
  trend = "+18.2%",
  trendLabel = "vs last month",
  icon,
  badge = "Active",
  onAction,
}) {
  return (
    <Card className="rounded-2xl border border-border/70 bg-card/90 backdrop-blur-md shadow-xs hover:-translate-y-1 hover:shadow-lg hover:border-border transition-all duration-300">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="flex items-center gap-3">
          {icon && (
            <div className="flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 text-primary border border-primary/20 shadow-xs">
              {icon}
            </div>
          )}
          <div>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {title}
            </CardTitle>
            {description && (
              <CardDescription className="text-xs text-muted-foreground/80">
                {description}
              </CardDescription>
            )}
          </div>
        </div>

        {badge && (
          <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
            {badge}
          </span>
        )}
      </CardHeader>

      <CardContent className="pt-1 pb-3">
        <p className="text-3xl font-bold tracking-tight text-foreground font-sans">
          {value}
        </p>

        {trend && (
          <div className="mt-2.5 flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
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
          className="rounded-full text-xs font-medium hover:bg-muted active:scale-[0.97] transition-all px-4"
        >
          Details
        </Button>
        <Button
          size="sm"
          onClick={onAction}
          className="rounded-full text-xs font-semibold shadow-xs hover:shadow-sm active:scale-[0.97] transition-all px-4"
        >
          Export <ArrowUpRight className="size-3.5 ml-1" />
        </Button>
      </CardFooter>
    </Card>
  );
}
