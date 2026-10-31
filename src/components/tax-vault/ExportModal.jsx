"use client";

import { Check, FileDown, Loader2, Mail } from "lucide-react";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
} from "@/components/ui/modal";
import { taxVaultApi } from "@/lib/api/taxVault";
import { cn } from "@/lib/utils";

const selectClassName =
  "flex h-9.5 w-full rounded-xl border border-border/80 bg-background/80 px-3 py-2 text-sm text-foreground shadow-2xs focus-visible:border-primary/50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary/20";

/**
 * Lets the user pick a period and the formats their accountant wants.
 * Available formats come from the backend (export-options), so accountant-specific formats can be added there.
 */
export function ExportModal({
  isOpen,
  onClose,
  onCreated,
  taxYear,
  periods = [],
  formats,
  formatsError,
  defaultFormats = [],
  accountantEmail,
}) {
  const periodSelectId = useId();
  const noteId = useId();
  const [selected, setSelected] = useState(defaultFormats);
  const [periodKey, setPeriodKey] = useState("year");
  const [sendToAccountant, setSendToAccountant] = useState(false);
  const [saveAsDefault, setSaveAsDefault] = useState(false);
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const toggleFormat = (key) =>
    setSelected((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const res = await taxVaultApi.createExport({
        tax_year: taxYear,
        period_key: periodKey,
        formats: selected,
        send_to_accountant: sendToAccountant,
        note: note.trim() || null,
        save_as_default: saveAsDefault,
      });
      onCreated?.(res?.export);
    } catch (err) {
      setSubmitError(err?.message || "Export starten mislukt.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="xl">
      <ModalHeader
        title="Exporteren voor boekhouder"
        description="Kies de periode en de bestanden die je boekhouder wil ontvangen."
        icon={<FileDown className="size-5" />}
      />
      <ModalBody>
        <fieldset disabled={isSubmitting} className="space-y-5">
          <div className="space-y-1">
            <label
              htmlFor={periodSelectId}
              className="text-[11px] font-medium text-muted-foreground"
            >
              Periode
            </label>
            <select
              id={periodSelectId}
              value={periodKey}
              onChange={(e) => setPeriodKey(e.target.value)}
              className={selectClassName}
            >
              <option value="year">Heel {taxYear}</option>
              {periods.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <p className="text-[11px] font-medium text-muted-foreground">
              Bestanden
            </p>
            {formatsError ? (
              <p className="text-xs text-destructive">{formatsError}</p>
            ) : !formats ? (
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {formats.map((format) => {
                  const isOn = selected.includes(format.key);
                  return (
                    <button
                      key={format.key}
                      type="button"
                      onClick={() => toggleFormat(format.key)}
                      aria-pressed={isOn}
                      className={cn(
                        "flex items-start gap-2.5 rounded-xl border p-3 text-left transition-all cursor-pointer",
                        isOn
                          ? "border-primary/40 bg-primary/5"
                          : "border-border/60 hover:bg-muted/40",
                      )}
                    >
                      <span
                        className={cn(
                          "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border",
                          isOn
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border",
                        )}
                      >
                        {isOn && <Check className="size-3" />}
                      </span>
                      <span>
                        <span className="block text-xs font-semibold text-foreground">
                          {format.label}
                        </span>
                        <span className="block text-[11px] text-muted-foreground">
                          {format.description}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2.5 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={sendToAccountant}
                onChange={(e) => setSendToAccountant(e.target.checked)}
                disabled={!accountantEmail}
                className="size-4 accent-primary"
              />
              <span>
                <Mail className="mr-1 inline size-3.5" />
                {accountantEmail
                  ? `Direct mailen naar ${accountantEmail}`
                  : "Mailen naar boekhouder (stel eerst een e-mailadres in bij Instellingen)"}
              </span>
            </label>
            <label className="flex items-center gap-2.5 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={saveAsDefault}
                onChange={(e) => setSaveAsDefault(e.target.checked)}
                className="size-4 accent-primary"
              />
              Onthoud deze bestanden als standaard voor mijn boekhouder
            </label>
          </div>

          {sendToAccountant && (
            <div className="space-y-1">
              <label
                htmlFor={noteId}
                className="text-[11px] font-medium text-muted-foreground"
              >
                Bericht aan boekhouder (optioneel)
              </label>
              <textarea
                id={noteId}
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="flex w-full rounded-xl border border-border/80 bg-background/80 px-3.5 py-2 text-sm text-foreground shadow-2xs focus-visible:border-primary/50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary/20 resize-y"
              />
            </div>
          )}
        </fieldset>
      </ModalBody>
      <ModalFooter>
        {submitError && (
          <span className="mr-auto text-xs text-destructive">
            {submitError}
          </span>
        )}
        <Button variant="outline" size="sm" onClick={onClose}>
          Annuleer
        </Button>
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={isSubmitting || selected.length === 0}
        >
          {isSubmitting ? <Loader2 className="animate-spin" /> : <FileDown />}
          {sendToAccountant ? "Maken en versturen" : "Export maken"}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

export default ExportModal;
