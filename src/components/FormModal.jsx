"use client";

import { ChevronDown, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
} from "@/components/ui/modal";
import { cn } from "@/lib/utils";

/**
 * Reusable Form Modal whose fields are dynamically generated from props.
 * Usable anywhere across the application (Add Client, Create Invoice, Record Cash/PIN Sale, Edit Entry, etc.)
 *
 * Props:
 * - isOpen: boolean
 * - onClose: () => void
 * - onSubmit: (formValues: Record<string, any>, actions: { resetForm, setSubmitting }) => void | Promise<void>
 * - title: string | ReactNode
 * - description: string | ReactNode
 * - icon: ReactNode
 * - fields: Array<{
 *     name: string,
 *     label: string,
 *     type?: "text" | "number" | "email" | "tel" | "date" | "select" | "textarea" | "checkbox",
 *     placeholder?: string,
 *     defaultValue?: any,
 *     required?: boolean,
 *     colSpan?: 1 | 2,
 *     options?: Array<{ label: string, value: any }> | Array<string>,
 *     prefix?: string | ReactNode,
 *     suffix?: string | ReactNode,
 *     helperText?: string,
 *     disabled?: boolean,
 *     rows?: number,
 *     validate?: (value: any, formValues: Record<string, any>) => string | null,
 *   }>
 * - initialValues?: Record<string, any>
 * - submitLabel?: string (default "Save Changes")
 * - submitVariant?: "default" | "destructive" | "secondary"
 * - cancelLabel?: string (default "Cancel")
 * - isSubmitting?: boolean (optional external control)
 * - footerNote?: string
 * - maxWidth?: "sm" | "md" | "lg" | "xl" (default "lg")
 * - children?: ReactNode (optional extra custom JSX)
 */
export function FormModal({
  isOpen,
  onClose,
  onSubmit,
  title = "Form",
  description,
  icon,
  fields = [],
  initialValues = {},
  submitLabel = "Save Changes",
  submitVariant = "default",
  cancelLabel = "Cancel",
  isSubmitting: externalSubmitting,
  footerNote,
  maxWidth = "lg",
  children,
}) {
  const [formValues, setFormValues] = useState({});
  const [errors, setErrors] = useState({});
  const [internalSubmitting, setInternalSubmitting] = useState(false);

  const isSubmitting = externalSubmitting ?? internalSubmitting;

  // Initialize or reset form values when opening or when initialValues/fields change
  useEffect(() => {
    if (!isOpen) return;

    const defaults = {};
    for (const f of fields) {
      if (initialValues[f.name] !== undefined) {
        defaults[f.name] = initialValues[f.name];
      } else if (f.defaultValue !== undefined) {
        defaults[f.name] = f.defaultValue;
      } else if (f.type === "checkbox") {
        defaults[f.name] = false;
      } else {
        defaults[f.name] = "";
      }
    }
    setFormValues(defaults);
    setErrors({});
  }, [isOpen, fields, initialValues]);

  const handleChange = (name, value) => {
    setFormValues((prev) => ({ ...prev, [name]: value }));
    // Clear error for field upon typing
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const validateForm = () => {
    const newErrors = {};
    for (const f of fields) {
      const val = formValues[f.name];

      if (f.required) {
        if (val === undefined || val === null || val === "") {
          newErrors[f.name] = `${f.label || f.name} is required`;
          continue;
        }
      }

      if (f.validate) {
        const customErr = f.validate(val, formValues);
        if (customErr) {
          newErrors[f.name] = customErr;
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setInternalSubmitting(true);
      const result = onSubmit?.(formValues, {
        resetForm: () => {
          const reset = {};
          for (const f of fields) reset[f.name] = f.defaultValue ?? "";
          setFormValues(reset);
        },
        setSubmitting: setInternalSubmitting,
      });

      if (result instanceof Promise) {
        await result;
      }
    } finally {
      setInternalSubmitting(false);
    }
  };

  const renderField = (f) => {
    const errorMsg = errors[f.name];
    const value = formValues[f.name] ?? "";
    const colSpanClass =
      f.colSpan === 2 || f.type === "textarea"
        ? "sm:col-span-2"
        : "sm:col-span-1";

    return (
      <div key={f.name} className={cn("space-y-1.5", colSpanClass)}>
        {/* Label & Required Indicator */}
        {f.type !== "checkbox" && (
          <label
            htmlFor={`field-${f.name}`}
            className="flex items-center justify-between text-xs font-semibold text-foreground"
          >
            <span>
              {f.label}
              {f.required && (
                <span className="text-destructive ml-1" title="Required">
                  *
                </span>
              )}
            </span>
          </label>
        )}

        {/* Input by Type */}
        {f.type === "textarea" ? (
          <textarea
            id={`field-${f.name}`}
            rows={f.rows || 3}
            value={value}
            disabled={f.disabled || isSubmitting}
            placeholder={f.placeholder}
            onChange={(e) => handleChange(f.name, e.target.value)}
            className={cn(
              "w-full rounded-xl border border-border/80 bg-background/80 px-3.5 py-2 text-sm font-sans text-foreground shadow-2xs transition-all duration-150",
              "placeholder:text-muted-foreground/70 resize-y",
              "focus-visible:border-primary/50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary/20",
              "disabled:cursor-not-allowed disabled:opacity-50",
              errorMsg &&
                "border-destructive focus-visible:ring-destructive/20",
            )}
          />
        ) : f.type === "select" ? (
          <div className="relative">
            <select
              id={`field-${f.name}`}
              value={value}
              disabled={f.disabled || isSubmitting}
              onChange={(e) => handleChange(f.name, e.target.value)}
              className={cn(
                "flex h-9.5 w-full appearance-none rounded-xl border border-border/80 bg-background/80 px-3.5 pr-8 py-2 text-sm font-sans text-foreground shadow-2xs transition-all duration-150 cursor-pointer",
                "focus-visible:border-primary/50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary/20",
                "disabled:cursor-not-allowed disabled:opacity-50",
                !value && "text-muted-foreground/70",
                errorMsg &&
                  "border-destructive focus-visible:ring-destructive/20",
              )}
            >
              {f.placeholder && (
                <option value="" disabled>
                  {f.placeholder}
                </option>
              )}
              {f.options?.map((opt) => {
                const optVal = typeof opt === "object" ? opt.value : opt;
                const optLabel = typeof opt === "object" ? opt.label : opt;
                return (
                  <option key={optVal} value={optVal}>
                    {optLabel}
                  </option>
                );
              })}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/70" />
          </div>
        ) : f.type === "checkbox" ? (
          <label className="flex items-center gap-3 pt-2 cursor-pointer select-none">
            <input
              type="checkbox"
              id={`field-${f.name}`}
              checked={Boolean(value)}
              disabled={f.disabled || isSubmitting}
              onChange={(e) => handleChange(f.name, e.target.checked)}
              className="size-4.5 rounded-md border-border text-primary accent-primary focus:ring-primary/20"
            />
            <div className="space-y-0.5">
              <span className="text-xs font-semibold text-foreground">
                {f.label}
              </span>
              {f.helperText && (
                <p className="text-[11px] text-muted-foreground">
                  {f.helperText}
                </p>
              )}
            </div>
          </label>
        ) : (
          <div className="relative">
            {f.prefix && (
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono font-semibold text-muted-foreground">
                {f.prefix}
              </span>
            )}
            <Input
              id={`field-${f.name}`}
              type={f.type || "text"}
              value={value}
              disabled={f.disabled || isSubmitting}
              placeholder={f.placeholder}
              min={f.min}
              max={f.max}
              step={f.step}
              onChange={(e) => handleChange(f.name, e.target.value)}
              className={cn(
                f.prefix && "pl-8",
                f.suffix && "pr-8",
                errorMsg &&
                  "border-destructive focus-visible:ring-destructive/20",
              )}
            />
            {f.suffix && (
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-muted-foreground">
                {f.suffix}
              </span>
            )}
          </div>
        )}

        {/* Helper or Error Text */}
        {errorMsg ? (
          <p className="text-[11px] text-destructive font-medium">{errorMsg}</p>
        ) : f.helperText && f.type !== "checkbox" ? (
          <p className="text-[11px] text-muted-foreground">{f.helperText}</p>
        ) : null}
      </div>
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth={maxWidth}>
      <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
        <ModalHeader title={title} description={description} icon={icon} />

        <ModalBody className="space-y-4">
          {children}

          {/* Form Fields Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {fields.map(renderField)}
          </div>

          {footerNote && (
            <p className="text-[11px] text-muted-foreground/80 italic pt-1">
              {footerNote}
            </p>
          )}
        </ModalBody>

        <ModalFooter className="flex items-center justify-between sm:justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-full text-xs px-4 active:scale-95 transition-all"
          >
            {cancelLabel}
          </Button>

          <Button
            type="submit"
            variant={submitVariant}
            size="sm"
            disabled={isSubmitting}
            className="rounded-full text-xs font-semibold px-5 shadow-xs hover:shadow-md active:scale-95 transition-all min-w-24 justify-center"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                Saving...
              </>
            ) : (
              submitLabel
            )}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

export default FormModal;
