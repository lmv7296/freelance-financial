"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DEFAULT_LINE_ITEMS } from "@/data/invoices";
import { calculateLineItemsTotals, formatEuro } from "@/lib/formatCurrency";

/**
 * LineItemsEditor: A reusable building block for itemized invoice and work order lines.
 * Supports splitting labor/hours and materials, adding/deleting rows, and live tax/total calculations.
 *
 * @param {object} props
 * @param {object} props.formValues - Current values containing .items and .vatRate.
 * @param {Function} props.handleChange - Change handler function (field, value).
 */
export function LineItemsEditor({ formValues, handleChange }) {
  const items =
    Array.isArray(formValues.items) && formValues.items.length > 0
      ? formValues.items
      : DEFAULT_LINE_ITEMS;

  const handleUpdateItem = (index, field, value) => {
    const updated = items.map((it, idx) => {
      if (idx !== index) return it;
      return { ...it, [field]: value };
    });
    handleChange("items", updated);
  };

  const handleAddItem = () => {
    const newItem = {
      id: `item-${Date.now()}`,
      description: "",
      quantity: 1,
      unitPrice: "",
    };
    handleChange("items", [...items, newItem]);
  };

  const handleRemoveItem = (index) => {
    if (items.length <= 1) return;
    const filtered = items.filter((_, idx) => idx !== index);
    handleChange("items", filtered);
  };

  const vatRate = Number.parseFloat(formValues.vatRate || "21") || 0;
  const { subtotal, vatAmount, total } = calculateLineItemsTotals(
    items,
    vatRate,
  );

  return (
    <div className="space-y-3 col-span-1 sm:col-span-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
          <span>Werkzaamheden & Factuurregels (Splits uren & materialen)</span>
          <span className="text-destructive">*</span>
        </div>
        <span className="text-[11px] text-muted-foreground font-mono">
          {items.length} {items.length === 1 ? "regel" : "regels"}
        </span>
      </div>

      {/* Line items list */}
      <div className="space-y-2 rounded-xl border border-border/70 bg-muted/20 p-2.5 sm:p-3">
        {items.map((it, idx) => {
          const q = Number.parseFloat(it.quantity) || 0;
          const p =
            Number.parseFloat(
              String(it.unitPrice)
                .replace(/[^0-9.,]/g, "")
                .replace(",", "."),
            ) || 0;
          const lineTotal = q * p;

          return (
            <div
              key={it.id || idx}
              className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-2.5 rounded-lg border border-border/60 bg-background shadow-2xs"
            >
              {/* Omschrijving */}
              <div className="flex-1 min-w-0">
                <Input
                  value={it.description}
                  onChange={(e) =>
                    handleUpdateItem(idx, "description", e.target.value)
                  }
                  placeholder="Omschrijving werkzaamheid of materiaal..."
                  className="h-8.5 text-xs rounded-lg"
                />
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {/* Aantal / Uren */}
                <div className="w-20">
                  <Input
                    type="number"
                    min="0.25"
                    step="0.5"
                    value={it.quantity}
                    onChange={(e) =>
                      handleUpdateItem(idx, "quantity", e.target.value)
                    }
                    placeholder="Aantal"
                    className="h-8.5 text-xs font-mono text-center rounded-lg"
                    title="Aantal / uren"
                  />
                </div>

                {/* Prijs per eenheid */}
                <div className="w-28 relative">
                  <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-muted-foreground">
                    €
                  </span>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={it.unitPrice}
                    onChange={(e) =>
                      handleUpdateItem(idx, "unitPrice", e.target.value)
                    }
                    placeholder="Prijs"
                    className="h-8.5 text-xs font-mono pl-6 rounded-lg"
                    title="Prijs per eenheid"
                  />
                </div>

                {/* Regel Totaal */}
                <div className="w-24 text-right pr-1">
                  <p className="text-xs font-mono font-bold text-foreground tabular-nums">
                    {formatEuro(lineTotal)}
                  </p>
                </div>

                {/* Verwijderknop */}
                <button
                  type="button"
                  onClick={() => handleRemoveItem(idx)}
                  disabled={items.length <= 1}
                  className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
                  title="Regel verwijderen"
                  aria-label="Regel verwijderen"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </div>
          );
        })}

        {/* Add Row Button */}
        <div className="pt-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddItem}
            className="w-full sm:w-auto rounded-lg text-xs font-semibold h-8 px-3 border-dashed border-border/90 hover:border-primary/50 hover:bg-primary/5 text-primary flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="size-3.5" />
            Werkzaamheid / Regel Toevoegen
          </Button>
        </div>
      </div>

      {/* Live Totalen Samenvatting */}
      <div className="flex flex-col items-end gap-1 p-3 rounded-xl border border-border/60 bg-muted/30 font-mono text-xs">
        <div className="flex justify-between w-64 text-muted-foreground">
          <span>Subtotaal ({items.length} regels):</span>
          <span className="tabular-nums font-semibold">
            {formatEuro(subtotal)}
          </span>
        </div>
        <div className="flex justify-between w-64 text-muted-foreground">
          <span>BTW ({vatRate}%):</span>
          <span className="tabular-nums font-semibold">
            {formatEuro(vatAmount)}
          </span>
        </div>
        <div className="flex justify-between w-64 text-sm font-bold text-foreground border-t border-border/80 pt-1.5 mt-0.5">
          <span>Totaal incl. BTW:</span>
          <span className="tabular-nums text-base text-primary">
            {formatEuro(total)}
          </span>
        </div>
      </div>
    </div>
  );
}
