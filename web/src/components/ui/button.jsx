import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva } from "class-variance-authority";
import { cn } from "cn";

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-full border border-transparent bg-clip-padding text-sm font-semibold whitespace-nowrap transition-all duration-150 ease-out outline-none select-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 active:scale-[0.97] cursor-pointer disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-xs hover:bg-primary/90 hover:shadow-sm active:scale-[0.97]",
        outline:
          "border border-border/80 bg-background/80 backdrop-blur-xs text-foreground hover:bg-muted/80 hover:text-foreground active:scale-[0.97] dark:border-white/[0.1] dark:bg-card/40",
        secondary:
          "bg-secondary/90 text-secondary-foreground border border-border/60 hover:bg-secondary active:scale-[0.97]",
        ghost:
          "hover:bg-muted/70 hover:text-foreground active:scale-[0.97] dark:hover:bg-muted/50",
        destructive:
          "bg-destructive/15 text-destructive border border-destructive/25 hover:bg-destructive/25 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 active:scale-[0.97]",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 gap-2 px-4 text-xs font-semibold",
        xs: "h-6.5 gap-1 px-2.5 text-[0.75rem] font-medium [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1.5 px-3 text-xs font-medium [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-10.5 gap-2.5 px-5.5 text-sm font-semibold shadow-xs",
        icon: "size-9",
        "icon-xs": "size-6.5 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8 [&_svg:not([class*='size-'])]:size-3.5",
        "icon-lg": "size-10.5 [&_svg:not([class*='size-'])]:size-5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
