"use client";

import {
  Building2,
  Check,
  ChevronDown,
  MapPin,
  Search,
  User,
  UserPlus,
  X,
} from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { getStoredClients } from "@/data/clients";
import { cn } from "@/lib/utils";

/**
 * ClientAutocomplete: Autocomplete input powered by client dossiers from ClientsPage.
 * Allows choosing an existing customer or freely typing a new custom client name.
 */
export function ClientAutocomplete({
  clientType = "particulier",
  value = "",
  onChange,
  onSelectClient,
  placeholder = "Typ om te zoeken of voer een nieuwe naam in...",
  label,
  required = false,
  error,
  disabled = false,
  id: customId,
}) {
  const autoId = useId();
  const inputId = customId || `client-autocomplete-${autoId}`;
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [clients, setClients] = useState([]);
  const [selectedMatch, setSelectedMatch] = useState(null);

  // Sync clients from stored data and live updates
  useEffect(() => {
    setClients(getStoredClients());

    const handleUpdate = () => {
      setClients(getStoredClients());
    };

    window.addEventListener("clients-updated", handleUpdate);
    return () => window.removeEventListener("clients-updated", handleUpdate);
  }, []);

  // Filter clients by category (particulier / bedrijf)
  const categoryClients = useMemo(() => {
    return clients.filter((c) => {
      if (!clientType) return true;
      return c.type === clientType;
    });
  }, [clients, clientType]);

  // Filter based on input value query
  const suggestions = useMemo(() => {
    const query = (value || "").trim().toLowerCase();
    if (!query) {
      // Show up to 5 initial clients when input is empty
      return categoryClients.slice(0, 5);
    }

    return categoryClients.filter((c) => {
      const matchName = c.name?.toLowerCase().includes(query);
      const matchAddress =
        c.addressLine1?.toLowerCase().includes(query) ||
        c.addressLine2?.toLowerCase().includes(query);
      const matchPhone = c.phone?.toLowerCase().includes(query);
      const matchEmail = c.email?.toLowerCase().includes(query);
      const matchContact = c.contactPerson?.toLowerCase().includes(query);
      const matchKvk = c.kvk?.toLowerCase().includes(query);

      return (
        matchName ||
        matchAddress ||
        matchPhone ||
        matchEmail ||
        matchContact ||
        matchKvk
      );
    });
  }, [categoryClients, value]);

  // Track if current value corresponds to an existing client
  useEffect(() => {
    if (!value?.trim()) {
      setSelectedMatch(null);
      return;
    }
    const match = categoryClients.find(
      (c) => c.name?.trim().toLowerCase() === value.trim().toLowerCase(),
    );
    setSelectedMatch(match || null);
  }, [value, categoryClients]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (client) => {
    if (!client) return;
    onChange?.(client.name);
    setSelectedMatch(client);
    onSelectClient?.(client);
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange?.("");
    setSelectedMatch(null);
    inputRef.current?.focus();
    setIsOpen(true);
  };

  const handleKeyDown = (e) => {
    if (disabled) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        setHighlightedIndex(0);
      } else {
        setHighlightedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : 0,
        );
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        setHighlightedIndex(suggestions.length - 1);
      } else {
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : suggestions.length - 1,
        );
      }
    } else if (e.key === "Enter") {
      if (isOpen && highlightedIndex >= 0 && suggestions[highlightedIndex]) {
        e.preventDefault();
        handleSelect(suggestions[highlightedIndex]);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
      setHighlightedIndex(-1);
    }
  };

  // Helper to highlight matching text
  const renderHighlighted = (text, query) => {
    if (!query || !text) return text;
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const matchIndex = lowerText.indexOf(lowerQuery);
    if (matchIndex === -1) return text;

    const before = text.slice(0, matchIndex);
    const matched = text.slice(matchIndex, matchIndex + query.length);
    const after = text.slice(matchIndex + query.length);

    return (
      <>
        {before}
        <span className="font-bold text-primary underline underline-offset-2">
          {matched}
        </span>
        {after}
      </>
    );
  };

  const isBedrijf = clientType === "bedrijf";

  return (
    <div ref={containerRef} className="relative w-full space-y-1.5">
      {/* Label with Smart Autocomplete Pill */}
      {label && (
        <div className="flex items-center justify-between text-xs font-semibold text-foreground">
          <label
            htmlFor={inputId}
            className="flex items-center gap-1 cursor-pointer"
          >
            <span>{label}</span>
            {required && (
              <span className="text-destructive ml-0.5" title="Verplicht">
                *
              </span>
            )}
          </label>
          <span className="inline-flex items-center gap-1 text-[10.5px] font-normal text-muted-foreground bg-muted/60 hover:bg-muted px-2 py-0.5 rounded-full border border-border/50 transition-colors">
            <span>Autocomplete uit dossier</span>
          </span>
        </div>
      )}

      {/* Input Field with Left & Right Icons */}
      <div className="relative">
        <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/70">
          {isBedrijf ? (
            <Building2 className="size-4 text-indigo-500/80" />
          ) : (
            <User className="size-4 text-emerald-600/80 dark:text-emerald-400/80" />
          )}
        </div>

        <input
          ref={inputRef}
          id={inputId}
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          aria-controls={`${inputId}-dropdown`}
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          autoComplete="off"
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            onChange?.(e.target.value);
            setIsOpen(true);
            setHighlightedIndex(0);
          }}
          onKeyDown={handleKeyDown}
          className={cn(
            "flex h-9.5 w-full rounded-xl border border-border/80 bg-background/80 pl-9 pr-16 py-2 text-sm font-sans text-foreground shadow-2xs transition-all duration-150",
            "placeholder:text-muted-foreground/70",
            "focus-visible:border-primary/50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary/20",
            "disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-destructive focus-visible:ring-destructive/20",
            selectedMatch && "border-primary/40 bg-primary/[0.02]",
          )}
        />

        {/* Right action buttons: Clear (X) & Toggle Dropdown Chevron */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {value && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="flex size-6 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
              title="Wissen"
              aria-label="Invoer wissen"
            >
              <X className="size-3.5" />
            </button>
          )}

          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              if (!isOpen) {
                inputRef.current?.focus();
              }
              setIsOpen(!isOpen);
            }}
            className="flex size-6 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
            title="Toon suggesties"
            aria-label="Suggesties openen"
          >
            <ChevronDown
              className={cn(
                "size-3.5 transition-transform duration-200",
                isOpen && "rotate-180",
              )}
            />
          </button>
        </div>
      </div>

      {/* Selected Client Dossier Confirmation Ribbon */}
      {selectedMatch && (
        <div className="flex items-center justify-between px-2.5 py-1 rounded-lg border border-primary/25 bg-primary/5 text-[11px] text-foreground animate-in fade-in-50 duration-200">
          <div className="flex items-center gap-1.5 truncate">
            <Check className="size-3 text-primary shrink-0" />
            <span className="text-muted-foreground">Klant gekoppeld:</span>
            <span className="font-semibold text-primary truncate">
              {selectedMatch.name}
            </span>
            <span className="text-muted-foreground/80 font-mono text-[10px]">
              ({selectedMatch.id})
            </span>
          </div>
          <span className="text-[10px] text-muted-foreground shrink-0 font-medium ml-2">
            {selectedMatch.addressLine1}
          </span>
        </div>
      )}

      {/* Autocomplete Dropdown Popover */}
      {isOpen && !disabled && (
        <div
          id={`${inputId}-dropdown`}
          className="absolute z-50 left-0 right-0 mt-1 rounded-2xl border border-border/80 bg-card/95 backdrop-blur-md p-1.5 shadow-xl max-h-72 overflow-y-auto divide-y divide-border/40 animate-in fade-in-50 zoom-in-95 duration-150"
        >
          {/* Header indicator inside dropdown - only shown when suggestions exist */}
          {suggestions.length > 0 && (
            <div className="px-3 py-1.5 text-[11px] font-semibold text-muted-foreground flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Search className="size-3 text-primary" />
                {value?.trim()
                  ? `Zoekresultaten voor "${value.trim()}":`
                  : isBedrijf
                    ? "Bestaande zakelijke klanten / bedrijven:"
                    : "Bestaande particuliere klanten:"}
              </span>
              <span className="text-[10px] font-mono text-muted-foreground/80">
                {suggestions.length}{" "}
                {suggestions.length === 1 ? "klant" : "klanten"}
              </span>
            </div>
          )}

          {/* List of Suggestions */}
          {suggestions.length > 0 ? (
            <div className="pt-1 space-y-1">
              {suggestions.map((client, index) => {
                const isHighlighted = highlightedIndex === index;
                const isSelected =
                  value?.trim().toLowerCase() ===
                  client.name?.trim().toLowerCase();

                return (
                  <button
                    key={client.id}
                    type="button"
                    onClick={() => handleSelect(client)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={cn(
                      "w-full flex items-start gap-3 p-2.5 rounded-xl text-left transition-all duration-150 cursor-pointer select-none",
                      isHighlighted
                        ? "bg-primary/10 text-foreground"
                        : "hover:bg-muted/60 text-foreground/90",
                      isSelected && "ring-1 ring-primary/40 bg-primary/15",
                    )}
                  >
                    {/* Category Icon Badge */}
                    <div
                      className={cn(
                        "flex size-8 items-center justify-center rounded-xl shrink-0 mt-0.5 text-xs font-bold shadow-2xs",
                        client.type === "bedrijf"
                          ? "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30"
                          : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30",
                      )}
                    >
                      {client.type === "bedrijf" ? (
                        <Building2 className="size-4" />
                      ) : (
                        <User className="size-4" />
                      )}
                    </div>

                    {/* Details Column */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-bold text-foreground truncate">
                          {renderHighlighted(client.name, value?.trim())}
                        </p>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-md bg-muted text-muted-foreground shrink-0">
                          {client.id}
                        </span>
                      </div>

                      {/* Sub-info based on type */}
                      <div className="text-[11px] text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        {client.type === "bedrijf" && client.contactPerson && (
                          <span className="font-medium text-foreground/80">
                            T.a.v. {client.contactPerson}
                          </span>
                        )}

                        {client.type === "bedrijf" && client.kvk && (
                          <span className="font-mono text-[10px]">
                            KvK {client.kvk}
                          </span>
                        )}

                        {client.addressLine1 && (
                          <span className="flex items-center gap-0.5 truncate">
                            <MapPin className="size-2.5 shrink-0 opacity-70" />
                            {client.addressLine1}
                          </span>
                        )}

                        {client.phone && (
                          <span className="font-mono text-[10px] text-muted-foreground/80">
                            {client.phone}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Checkmark if selected */}
                    {isSelected && (
                      <div className="self-center shrink-0 text-primary">
                        <Check className="size-4" />
                      </div>
                    )}
                  </button>
                );
              })}
              {/* Optional footer action when typing a new custom client while suggestions exist */}
              {value?.trim() &&
                !suggestions.some(
                  (c) =>
                    c.name?.trim().toLowerCase() ===
                    value?.trim().toLowerCase(),
                ) && (
                  <div className="pt-1.5 px-1 pb-0.5">
                    <button
                      type="button"
                      onClick={() => setIsOpen(false)}
                      className="w-full h-8.5 px-3 rounded-lg border border-dashed border-primary/40 bg-primary/5 hover:bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-[0.99] cursor-pointer"
                    >
                      <UserPlus className="size-3.5 shrink-0" />
                      <span className="truncate">
                        Als nieuwe klant &ldquo;{value.trim()}&rdquo; gebruiken
                      </span>
                    </button>
                  </div>
                )}
            </div>
          ) : (
            /* No Existing Client Found - Compact Action Card */
            <div className="p-2 sm:p-2.5 bg-muted/25 rounded-xl space-y-1.5">
              <div className="flex items-center justify-between px-1 text-xs">
                <span className="text-muted-foreground flex items-center gap-1.5 truncate">
                  <UserPlus className="size-3.5 text-primary shrink-0" />
                  Nieuwe klant:
                  <strong className="text-foreground truncate font-semibold">
                    &ldquo;{value?.trim() || "Onbekend"}&rdquo;
                  </strong>
                </span>
                <span className="text-[10px] text-muted-foreground/80 shrink-0 hidden sm:inline">
                  (niet in dossier)
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-full h-9 px-3 rounded-lg bg-primary text-primary-foreground font-semibold text-xs shadow-xs hover:bg-primary/90 active:scale-[0.98] transition-all duration-150 flex items-center justify-center gap-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <UserPlus className="size-3.5 shrink-0" />
                <span>Als nieuwe klant toevoegen / gebruiken</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ClientAutocomplete;
