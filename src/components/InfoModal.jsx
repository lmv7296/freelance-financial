"use client";

import { Check, Copy, ExternalLink, Info } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
} from "@/components/ui/modal";
import { cn } from "@/lib/utils";

/**
 * Reusable Information Modal (Show Modal)
 * Displays structured read-only information, key-value items, sections, and banners.
 *
 * Props:
 * - isOpen: boolean
 * - onClose: () => void
 * - title: string | ReactNode
 * - description: string | ReactNode
 * - badge: string | { text: string, variant?: "default" | "success" | "warning" | "destructive" }
 * - icon: ReactNode
 * - maxWidth: "sm" | "md" | "lg" | "xl" | "2xl" (default "lg")
 * - banner: { type?: "info" | "success" | "warning" | "destructive", title?: string, message: string }
 * - items: Array<{ label: string, value: any, colSpan?: 1 | 2, copyable?: boolean, href?: string, isMoney?: boolean, highlight?: string }>
 * - sections: Array<{ title?: string, items: Array<Item> }>
 * - children: ReactNode (optional custom body content)
 * - footerActions: ReactNode | Array<{ label: string, onClick: () => void, variant?: string, icon?: ReactNode }>
 */
export function InfoModal({
  isOpen,
  onClose,
  title,
  description,
  badge,
  icon,
  maxWidth = "lg",
  banner,
  items,
  sections,
  children,
  footerActions,
  closeLabel = "Close",
}) {
  const [copiedKey, setCopiedKey] = useState(null);

  const handleCopy = (text, key) => {
    if (!text) return;
    navigator.clipboard?.writeText(String(text));
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const renderBadge = () => {
    if (!badge) return null;
    if (typeof badge === "string") {
      return (
        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold border bg-primary/10 text-primary border-primary/20">
          {badge}
        </span>
      );
    }
    const variantStyles = {
      success:
        "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/25",
      warning:
        "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/25",
      destructive:
        "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/25",
      default: "bg-primary/10 text-primary border-primary/20",
    }[badge.variant || "default"];

    return (
      <span
        className={cn(
          "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold border",
          variantStyles,
        )}
      >
        {badge.text}
      </span>
    );
  };

  const renderBanner = () => {
    if (!banner) return null;
    const bannerThemes = {
      info: "bg-blue-500/10 border-blue-500/20 text-blue-800 dark:text-blue-200",
      success:
        "bg-emerald-500/10 border-emerald-500/20 text-emerald-800 dark:text-emerald-200",
      warning:
        "bg-amber-500/10 border-amber-500/20 text-amber-800 dark:text-amber-200",
      destructive:
        "bg-rose-500/10 border-rose-500/20 text-rose-800 dark:text-rose-200",
    }[banner.type || "info"];

    return (
      <div
        className={cn(
          "rounded-xl p-3.5 border text-xs flex items-start gap-2.5",
          bannerThemes,
        )}
      >
        <Info className="size-4 shrink-0 mt-0.5" />
        <div className="space-y-0.5 min-w-0">
          {banner.title && <p className="font-semibold">{banner.title}</p>}
          <p className="leading-relaxed opacity-90">{banner.message}</p>
        </div>
      </div>
    );
  };

  const renderItem = (item, prefix = "") => {
    const key = `${prefix}-${item.label}`;
    const isCopied = copiedKey === key;
    const colSpanClass = item.colSpan === 2 ? "sm:col-span-2" : "sm:col-span-1";

    return (
      <div
        key={key}
        className={cn(
          "rounded-xl bg-muted/30 border border-border/50 p-3 flex flex-col justify-between transition-all hover:border-border",
          colSpanClass,
        )}
      >
        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
          {item.label}
        </span>

        <div className="mt-1 flex items-center justify-between gap-2 min-w-0">
          {item.href ? (
            <a
              href={item.href}
              className="text-xs font-semibold text-primary hover:underline truncate flex items-center gap-1"
            >
              <span
                className={cn(
                  item.isMoney && "font-mono tabular-nums font-bold",
                )}
              >
                {item.value ?? "—"}
              </span>
              <ExternalLink className="size-3 shrink-0 opacity-70" />
            </a>
          ) : (
            <span
              className={cn(
                "text-xs font-semibold text-foreground truncate",
                item.isMoney && "font-mono tabular-nums text-sm font-bold",
                item.highlight === "success" &&
                  "text-emerald-600 dark:text-emerald-400",
                item.highlight === "warning" &&
                  "text-amber-600 dark:text-amber-400",
                item.highlight === "destructive" &&
                  "text-rose-600 dark:text-rose-400",
              )}
            >
              {item.value ?? "—"}
            </span>
          )}

          {item.copyable && item.value && (
            <button
              type="button"
              onClick={() => handleCopy(item.value, key)}
              className="size-6 flex shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground active:scale-95 transition-all cursor-pointer"
              title={`Copy ${item.label}`}
            >
              {isCopied ? (
                <Check className="size-3 text-emerald-600" />
              ) : (
                <Copy className="size-3" />
              )}
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderFooter = () => {
    if (footerActions && Array.isArray(footerActions)) {
      return footerActions.map((action) => (
        <Button
          key={action.label}
          variant={action.variant || "default"}
          onClick={action.onClick}
          size="sm"
          className="rounded-full text-xs font-medium px-4 active:scale-95 transition-all"
        >
          {action.icon && <span className="mr-1.5">{action.icon}</span>}
          {action.label}
        </Button>
      ));
    }

    if (footerActions) {
      return footerActions;
    }

    return (
      <Button
        variant="outline"
        size="sm"
        onClick={onClose}
        className="rounded-full text-xs px-5 active:scale-95 transition-all"
      >
        {closeLabel}
      </Button>
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth={maxWidth}>
      <ModalHeader
        title={title}
        description={description}
        icon={icon}
        badge={renderBadge()}
      />

      <ModalBody className="space-y-4">
        {renderBanner()}

        {/* Flat Items Grid */}
        {items && items.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {items.map((item) => renderItem(item, "flat"))}
          </div>
        )}

        {/* Grouped Sections */}
        {sections?.map((sec) => (
          <div
            key={sec.title || "section"}
            className="space-y-2 pt-2 first:pt-0"
          >
            {sec.title && (
              <h4 className="text-xs font-bold text-foreground tracking-wide uppercase">
                {sec.title}
              </h4>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {sec.items?.map((item) => renderItem(item, sec.title || "sec"))}
            </div>
          </div>
        ))}

        {children}
      </ModalBody>

      <ModalFooter>{renderFooter()}</ModalFooter>
    </Modal>
  );
}

export default InfoModal;
