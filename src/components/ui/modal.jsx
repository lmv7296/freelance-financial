"use client";

import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

/**
 * Base Modal Primitive with backdrop, keyboard escape, scroll locking, and smooth animations.
 */
export function Modal({
  isOpen,
  onClose,
  children,
  maxWidth = "lg",
  showCloseButton = true,
  closeOnBackdropClick = true,
  className,
}) {
  const [mounted, setMounted] = useState(false);
  const modalRef = useRef(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock body scroll and handle Escape key
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!mounted || !isOpen) return null;

  const maxWidthClasses =
    {
      sm: "sm:max-w-sm",
      md: "sm:max-w-md",
      lg: "sm:max-w-lg",
      xl: "sm:max-w-xl",
      "2xl": "sm:max-w-2xl md:max-w-3xl",
      "3xl": "sm:max-w-3xl md:max-w-4xl",
      full: "sm:max-w-5xl",
    }[maxWidth] || "sm:max-w-lg";

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-6 overflow-y-auto"
    >
      {/* Backdrop */}
      <button
        type="button"
        tabIndex={-1}
        aria-hidden="true"
        onClick={closeOnBackdropClick ? onClose : undefined}
        className="fixed inset-0 w-full h-full border-0 p-0 bg-black/45 backdrop-blur-xs transition-opacity duration-200 animate-in fade-in cursor-default"
      />

      {/* Modal Dialog Card */}
      <div
        ref={modalRef}
        className={cn(
          "relative w-full rounded-2xl bg-card text-card-foreground border border-border/80 shadow-2xl",
          "flex flex-col max-h-[94vh] sm:max-h-[92vh] overflow-hidden z-10 font-sans",
          "transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]",
          "animate-in fade-in zoom-in-95",
          maxWidthClasses,
          className,
        )}
      >
        {showCloseButton && (
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 z-20 flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground active:scale-95 transition-all cursor-pointer"
            aria-label="Close modal"
          >
            <X className="size-4" />
          </button>
        )}
        {children}
      </div>
    </div>,
    document.body,
  );
}

export function ModalHeader({
  title,
  description,
  icon,
  badge,
  children,
  className,
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1.5 px-6 pt-6 pb-4 border-b border-border/50 shrink-0",
        className,
      )}
    >
      <div className="flex items-center gap-3">
        {icon && (
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-2xs">
            {icon}
          </div>
        )}
        <div className="min-w-0 flex-1 pr-6">
          <div className="flex items-center gap-2 flex-wrap">
            {title && (
              <h2 className="text-lg font-bold tracking-tight text-foreground">
                {title}
              </h2>
            )}
            {badge && (
              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold border bg-primary/10 text-primary border-primary/20">
                {badge}
              </span>
            )}
          </div>
          {description && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
              {description}
            </p>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}

export function ModalBody({ children, className }) {
  return (
    <div
      className={cn(
        "flex-1 overflow-y-auto px-6 py-5 space-y-4 scrollbar-thin text-sm",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function ModalFooter({ children, className }) {
  return (
    <div
      className={cn(
        "flex items-center justify-end gap-2 px-6 py-4 border-t border-border/50 bg-muted/20 shrink-0",
        className,
      )}
    >
      {children}
    </div>
  );
}

export { FormModal } from "@/components/FormModal";
export { InfoModal } from "@/components/InfoModal";
