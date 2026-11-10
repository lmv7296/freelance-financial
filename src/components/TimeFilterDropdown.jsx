"use client";

import { Check, ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useT } from "@/lib/preferences/PreferencesContext";
import { cn } from "@/lib/utils";

const OPTIONS = [{ id: "30d" }, { id: "90d" }, { id: "6m" }, { id: "12m" }];

export function TimeFilterDropdown({ value = "30d", onChange, className }) {
  const t = useT();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(value);
  const dropdownRef = useRef(null);

  useEffect(() => {
    setSelectedId(value);
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const selectedOption =
    OPTIONS.find((opt) => opt.id === selectedId) || OPTIONS[0];

  const handleSelect = (option) => {
    setSelectedId(option.id);
    setIsOpen(false);
    onChange?.(option.id, t(`timeFilter.${option.id}`));
  };

  return (
    <div
      ref={dropdownRef}
      className={cn("relative inline-block text-left", className)}
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
          "border border-border/80 bg-background/80 hover:bg-muted text-foreground/90",
          "shadow-2xs active:scale-95 transition-all duration-150 cursor-pointer",
          isOpen && "ring-2 ring-primary/20 border-primary/40",
        )}
      >
        <span>{t(`timeFilter.${selectedOption.id}`)}</span>
        <ChevronDown
          className={cn(
            "size-3 text-muted-foreground transition-transform duration-200",
            isOpen && "rotate-180",
          )}
        />
      </button>

      {isOpen && (
        <div
          role="menu"
          className={cn(
            "absolute right-0 top-full mt-1.5 w-32 rounded-xl",
            "border border-border/80 bg-card/95 backdrop-blur-md shadow-lg p-1 z-50",
            "flex flex-col gap-0.5 font-sans",
          )}
        >
          {OPTIONS.map((option) => {
            const isSelected = option.id === selectedId;
            return (
              <button
                key={option.id}
                type="button"
                role="menuitem"
                onClick={() => handleSelect(option)}
                className={cn(
                  "flex items-center justify-between w-full px-2.5 py-1.5 text-xs rounded-lg transition-colors cursor-pointer",
                  isSelected
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-foreground hover:bg-muted text-left font-medium",
                )}
              >
                <span>{t(`timeFilter.${option.id}`)}</span>
                {isSelected && <Check className="size-3 text-primary" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default TimeFilterDropdown;
