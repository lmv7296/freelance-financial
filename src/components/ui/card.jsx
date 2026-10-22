import { TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Card Component (Material Design 3 + HeroUI Fusion)
 *
 * Can be used in two ways:
 * 1. Props-Driven Mode: Pass title, value, icon, trend, badge, etc. directly as props.
 * 2. Composable Primitive Mode: Use <Card>, <CardHeader>, <CardTitle>, <CardContent>, <CardFooter> as subcomponents.
 */
function Card({
  className,
  variant = "elevated",
  size = "default",
  interactive = false,
  onClick,

  // High-level props for reusable props-driven mode
  title,
  description,
  icon,
  iconColor = "primary",
  iconClassName,
  headerAction,
  badge,
  badgeVariant = "default",
  badgeDot = false,
  value,
  trend,
  trendLabel,
  trendDirection,
  children,
  footer,
  footerActions,
  headerClassName,
  contentClassName,
  footerClassName,

  ...props
}) {
  // HeroUI-style gradient icon pods
  const iconColorGradients = {
    primary:
      "bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 text-primary border-primary/20",
    emerald:
      "bg-gradient-to-br from-emerald-500/20 via-emerald-500/10 to-emerald-500/5 text-emerald-600 dark:text-emerald-400 border-emerald-500/25",
    amber:
      "bg-gradient-to-br from-amber-500/20 via-amber-500/10 to-amber-500/5 text-amber-600 dark:text-amber-400 border-amber-500/25",
    rose: "bg-gradient-to-br from-rose-500/20 via-rose-500/10 to-rose-500/5 text-rose-600 dark:text-rose-400 border-rose-500/25",
    blue: "bg-gradient-to-br from-blue-500/20 via-blue-500/10 to-blue-500/5 text-blue-600 dark:text-blue-400 border-blue-500/25",
    violet:
      "bg-gradient-to-br from-purple-500/20 via-purple-500/10 to-purple-500/5 text-purple-600 dark:text-purple-400 border-purple-500/25",
  };

  // Surface styles: crisp border + clean elevation so cards pop against background
  const variantStyles = {
    elevated:
      "border border-border/80 bg-card shadow-sm hover:shadow-md hover:border-foreground/20",
    glass:
      "border border-border/70 bg-card/85 backdrop-blur-xl shadow-md hover:shadow-xl",
    outlined:
      "border border-border/90 shadow-none bg-card hover:shadow-xs hover:border-foreground/30",
    filled:
      "border border-border/40 shadow-none bg-muted/60 dark:bg-muted/30 hover:bg-muted/80",
  };

  // HeroUI chip styles (punchy borders & saturated hues)
  const badgeStyles = {
    default: "bg-primary/15 text-primary border-primary/25",
    secondary: "bg-secondary text-secondary-foreground border-border/70",
    success:
      "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
    warning:
      "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
    destructive:
      "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
    outline: "border-border/80 text-muted-foreground bg-background/50",
  };

  const badgeDotColors = {
    default: "bg-primary",
    secondary: "bg-muted-foreground",
    success: "bg-emerald-500",
    warning: "bg-amber-500",
    destructive: "bg-rose-500",
    outline: "bg-muted-foreground",
  };

  const isClickable = interactive || Boolean(onClick);

  // If high-level props are provided, render the full structured card automatically
  const isPropsDriven = Boolean(
    title ||
      description ||
      icon ||
      value !== undefined ||
      trend ||
      badge ||
      footer ||
      footerActions,
  );

  // Auto-detect trend direction if not specified
  const resolvedTrendDirection =
    trendDirection ||
    (typeof trend === "string"
      ? trend.trim().startsWith("+")
        ? "up"
        : trend.trim().startsWith("-")
          ? "down"
          : "neutral"
      : "neutral");

  const baseCardClasses = cn(
    "group/card rounded-2xl relative flex flex-col justify-between overflow-hidden transition-all duration-200 ease-out font-sans",
    variantStyles[variant] || variantStyles.elevated,
    isClickable &&
      "cursor-pointer active:scale-[0.98] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary/40",
    className,
  );

  const cardInner = isPropsDriven ? (
    <div className="flex-1 flex flex-col">
      {/* Header Section */}
      {(title || description || icon || headerAction || badge) && (
        <CardHeader
          className={cn(
            "flex flex-col gap-1.5 pb-2 pt-5 px-5 space-y-0",
            headerClassName,
          )}
        >
          {/* Top row if icon is present */}
          {icon ? (
            <div className="flex items-center justify-between gap-3 pb-1">
              <div
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-xl border shadow-xs transition-transform duration-300 group-hover/card:scale-105",
                  iconColorGradients[iconColor] || iconColorGradients.primary,
                  iconClassName,
                )}
              >
                {icon}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {badge && (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold border transition-all duration-200",
                      badgeStyles[badgeVariant] || badgeStyles.default,
                    )}
                  >
                    {badgeDot && (
                      <span
                        className={cn(
                          "size-1.5 rounded-full animate-pulse",
                          badgeDotColors[badgeVariant] || "bg-primary",
                        )}
                      />
                    )}
                    {badge}
                  </span>
                )}
                {headerAction && <div>{headerAction}</div>}
              </div>
            </div>
          ) : null}

          {/* Title Row: when no icon, title sits on the left and badge on the right without crowding */}
          <div className="flex items-center justify-between gap-2 min-w-0">
            {title && (
              <CardTitle className="text-sm font-semibold tracking-tight text-foreground font-sans truncate">
                {title}
              </CardTitle>
            )}

            {!icon && (badge || headerAction) && (
              <div className="flex items-center gap-2 shrink-0">
                {badge && (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold border transition-all duration-200",
                      badgeStyles[badgeVariant] || badgeStyles.default,
                    )}
                  >
                    {badgeDot && (
                      <span
                        className={cn(
                          "size-1.5 rounded-full animate-pulse",
                          badgeDotColors[badgeVariant] || "bg-primary",
                        )}
                      />
                    )}
                    {badge}
                  </span>
                )}
                {headerAction && <div>{headerAction}</div>}
              </div>
            )}
          </div>

          {description && (
            <CardDescription className="text-xs text-muted-foreground font-sans line-clamp-1">
              {description}
            </CardDescription>
          )}
        </CardHeader>
      )}

      {/* Content Section */}
      <CardContent
        className={cn(
          "flex-1 flex flex-col justify-between px-5",
          title || description || icon ? "pt-1 pb-4" : "py-5",
          contentClassName,
        )}
      >
        {/* Main Metric Value */}
        {value !== undefined && value !== null && (
          <div className="flex-1 flex flex-col justify-between my-1">
            <div className="text-2xl font-bold tracking-tight text-foreground font-sans tabular-nums">
              {value}
            </div>

            {/* HeroUI Trend Capsule - Stick to bottom */}
            {(trend || trendLabel) && (
              <div className="mt-4 pt-1 flex items-center gap-2 text-xs font-sans">
                {trend && (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold border transition-colors",
                      resolvedTrendDirection === "up" &&
                        "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/25",
                      resolvedTrendDirection === "down" &&
                        "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/25",
                      resolvedTrendDirection === "neutral" &&
                        "bg-muted text-muted-foreground border-border/60",
                    )}
                  >
                    {resolvedTrendDirection === "up" && (
                      <TrendingUp className="size-3.5" />
                    )}
                    {resolvedTrendDirection === "down" && (
                      <TrendingDown className="size-3.5" />
                    )}
                    {trend}
                  </span>
                )}
                {trendLabel && (
                  <span className="text-muted-foreground font-medium">
                    {trendLabel}
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Custom Children Content */}
        {children && <div className="mt-2 flex-1">{children}</div>}
      </CardContent>
    </div>
  ) : (
    children
  );

  const cardFooter = (footer || footerActions) && (
    <CardFooter
      className={cn(
        "flex items-center justify-between border-t border-border/50 bg-muted/30 px-5 py-3 backdrop-blur-xs font-sans",
        footerClassName,
      )}
    >
      {footer ? (
        <div className="text-xs text-muted-foreground font-medium">
          {footer}
        </div>
      ) : (
        <div />
      )}

      {footerActions && (
        <div className="flex items-center gap-2">{footerActions}</div>
      )}
    </CardFooter>
  );

  return (
    <div
      data-slot="card"
      data-size={size}
      className={baseCardClasses}
      {...props}
    >
      {cardInner}
      {cardFooter}
    </div>
  );
}

function CardHeader({ className, ...props }) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "flex flex-col space-y-1.5 px-5 pt-5 pb-3 font-sans",
        className,
      )}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }) {
  return (
    <div
      data-slot="card-title"
      className={cn(
        "font-sans text-base font-semibold leading-snug tracking-tight text-foreground/90",
        className,
      )}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-xs text-muted-foreground font-sans", className)}
      {...props}
    />
  );
}

function CardAction({ className, ...props }) {
  return (
    <div
      data-slot="card-action"
      className={cn("self-start justify-self-end", className)}
      {...props}
    />
  );
}

function CardContent({ className, ...props }) {
  return (
    <div
      data-slot="card-content"
      className={cn(
        "px-5 pb-5 pt-1 text-sm text-card-foreground font-sans",
        className,
      )}
      {...props}
    />
  );
}

function CardFooter({ className, ...props }) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "flex items-center justify-between border-t border-border/50 bg-muted/30 px-5 py-3 backdrop-blur-xs font-sans",
        className,
      )}
      {...props}
    />
  );
}

// Export Card and ReusableCard (as an alias for seamless backwards compatibility)
export {
  Card,
  Card as ReusableCard,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
};

export default Card;
