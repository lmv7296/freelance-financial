"use client";

import { Building2, ChevronDown, Loader2, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
const EMPTY_FIELDS = [];
const EMPTY_INITIAL_VALUES = [];
const EMPTY_STEPS = [];

export function FormModal({
  isOpen,
  onClose,
  onSubmit,
  title = "Form",
  description,
  icon,
  steps = EMPTY_STEPS,
  fields = EMPTY_FIELDS,
  initialValues = EMPTY_INITIAL_VALUES,
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
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [internalSubmitting, setInternalSubmitting] = useState(false);
  const isSubmitting = externalSubmitting ?? internalSubmitting;

  const stepsRef = useRef(steps);
  stepsRef.current = steps;

  const fieldsRef = useRef(fields);
  fieldsRef.current = fields;

  const initialValuesRef = useRef(initialValues);
  initialValuesRef.current = initialValues;

  const prevIsOpenRef = useRef(false);

  // Initialize or reset form values only when the modal opens
  useEffect(() => {
    if (!isOpen) {
      prevIsOpenRef.current = false;
      return;
    }

    if (!prevIsOpenRef.current) {
      setCurrentStepIndex(0);
      const defaults = {};
      for (const f of fieldsRef.current) {
        if (initialValuesRef.current[f.name] !== undefined) {
          defaults[f.name] = initialValuesRef.current[f.name];
        } else if (typeof f.defaultValue === "function") {
          defaults[f.name] = f.defaultValue(defaults);
        } else if (f.defaultValue !== undefined) {
          defaults[f.name] =
            Array.isArray(f.defaultValue) ||
            (typeof f.defaultValue === "object" && f.defaultValue !== null)
              ? JSON.parse(JSON.stringify(f.defaultValue))
              : f.defaultValue;
        } else if (f.type === "checkbox") {
          defaults[f.name] = false;
        } else if (f.type === "switch" || f.type === "segmented") {
          defaults[f.name] =
            typeof f.options?.[0] === "object"
              ? f.options[0].value
              : f.options?.[0] || "";
        } else {
          defaults[f.name] = "";
        }
      }
      setFormValues(defaults);
      setErrors({});
    }

    prevIsOpenRef.current = true;
  }, [isOpen]);

  const handleChange = (name, value) => {
    setFormValues((prev) => {
      let next = { ...prev, [name]: value };
      const fieldDef = fieldsRef.current.find((f) => f.name === name);
      if (typeof fieldDef?.onChange === "function") {
        const customUpdates = fieldDef.onChange(value, next, prev);
        if (customUpdates && typeof customUpdates === "object") {
          next = customUpdates;
        }
      }
      return next;
    });
    // Clear error for field upon typing
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const isFieldVisible = (f) => {
    if (typeof f.showIf === "function") {
      return Boolean(f.showIf(formValues));
    }
    return true;
  };

  const isFieldInStep = (f, stepIdx) => {
    if (!steps || steps.length <= 1) return true;
    const stepObj = steps[stepIdx];
    if (f.step === undefined) return stepIdx === 0;
    return f.step === stepIdx || f.step === stepObj?.id;
  };

  const validateCurrentStep = () => {
    const newErrors = { ...errors };
    let hasError = false;

    for (const f of fields) {
      const inThisStep = isFieldInStep(f, currentStepIndex);
      const visible = isFieldVisible(f);

      if (!inThisStep || !visible) {
        if (newErrors[f.name]) {
          delete newErrors[f.name];
        }
        continue;
      }

      const val = formValues[f.name];
      const isReq =
        typeof f.required === "function"
          ? f.required(formValues)
          : Boolean(f.required);
      const labelText =
        typeof f.label === "function" ? f.label(formValues) : f.label;

      if (isReq) {
        if (val === undefined || val === null || val === "") {
          newErrors[f.name] = `${labelText || f.name} is verplicht`;
          hasError = true;
          continue;
        }
      }

      if (f.validate) {
        const customErr = f.validate(val, formValues);
        if (customErr) {
          newErrors[f.name] = customErr;
          hasError = true;
          continue;
        }
      }

      delete newErrors[f.name];
    }

    setErrors(newErrors);
    return !hasError;
  };

  const validateAllSteps = () => {
    const newErrors = {};
    for (const f of fields) {
      if (!isFieldVisible(f)) continue;

      const val = formValues[f.name];
      const isReq =
        typeof f.required === "function"
          ? f.required(formValues)
          : Boolean(f.required);
      const labelText =
        typeof f.label === "function" ? f.label(formValues) : f.label;

      if (isReq) {
        if (val === undefined || val === null || val === "") {
          newErrors[f.name] = `${labelText || f.name} is verplicht`;
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

  const handleNextStep = (e) => {
    e?.preventDefault();
    if (!validateCurrentStep()) return;
    if (steps && currentStepIndex < steps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const handlePrevStep = (e) => {
    e?.preventDefault();
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateAllSteps()) return;

    try {
      setInternalSubmitting(true);
      const result = onSubmit?.(formValues, {
        resetForm: () => {
          const reset = {};
          for (const f of fields) reset[f.name] = f.defaultValue ?? "";
          setFormValues(reset);
          setCurrentStepIndex(0);
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
    if (!isFieldVisible(f)) return null;
    if (!isFieldInStep(f, currentStepIndex)) return null;

    const errorMsg = errors[f.name];
    const value = formValues[f.name] ?? "";
    const labelText =
      typeof f.label === "function" ? f.label(formValues) : f.label;
    const placeholderText =
      typeof f.placeholder === "function"
        ? f.placeholder(formValues)
        : f.placeholder;
    const helperText =
      typeof f.helperText === "function"
        ? f.helperText(formValues)
        : f.helperText;
    const isRequired =
      typeof f.required === "function"
        ? f.required(formValues)
        : Boolean(f.required);
    const colSpanVal =
      typeof f.colSpan === "function" ? f.colSpan(formValues) : f.colSpan;
    const colSpanClass =
      colSpanVal === 2 ||
      f.type === "textarea" ||
      f.type === "radio-cards" ||
      f.type === "switch" ||
      f.type === "segmented" ||
      f.type === "custom"
        ? "sm:col-span-2"
        : "sm:col-span-1";

    return (
      <div key={f.name} className={cn("space-y-1.5", colSpanClass)}>
        {/* Label & Required Indicator (for standard input types) */}
        {f.type !== "checkbox" &&
          f.type !== "radio-cards" &&
          f.type !== "switch" &&
          f.type !== "segmented" &&
          f.type !== "custom" && (
            <label
              htmlFor={`field-${f.name}`}
              className="flex items-center justify-between text-xs font-semibold text-foreground"
            >
              <span>
                {labelText}
                {isRequired && (
                  <span className="text-destructive ml-1" title="Verplicht">
                    *
                  </span>
                )}
              </span>
            </label>
          )}

        {/* Input by Type */}
        {f.type === "custom" ? (
          <div className="w-full">
            {typeof f.render === "function"
              ? f.render(formValues, { handleChange, errors, setFormValues })
              : f.content}
          </div>
        ) : f.type === "switch" || f.type === "segmented" ? (
          <div className="space-y-1.5">
            {labelText && (
              <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                <span>
                  {labelText}
                  {isRequired && (
                    <span className="text-destructive ml-1" title="Verplicht">
                      *
                    </span>
                  )}
                </span>
                {helperText && (
                  <span className="text-[10px] text-muted-foreground font-normal">
                    {helperText}
                  </span>
                )}
              </div>
            )}
            <div className="w-full p-1 bg-muted/70 dark:bg-muted/40 rounded-xl border border-border/60 flex items-center gap-1 shadow-inner/5">
              {f.options?.map((opt) => {
                const optVal = typeof opt === "object" ? opt.value : opt;
                const optLabel = typeof opt === "object" ? opt.label : opt;
                const isSelected = value === optVal;

                let IconComp = typeof opt === "object" ? opt.icon : null;
                if (!IconComp) {
                  if (optVal === "particulier") IconComp = User;
                  else if (optVal === "bedrijf") IconComp = Building2;
                }

                return (
                  <button
                    key={optVal}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => handleChange(f.name, optVal)}
                    disabled={f.disabled || isSubmitting}
                    className={cn(
                      "flex-1 h-9 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer select-none",
                      isSelected
                        ? "bg-background text-foreground shadow-xs ring-1 ring-border/60 font-bold"
                        : "text-muted-foreground hover:text-foreground hover:bg-background/40 font-medium",
                      f.disabled && "opacity-50 cursor-not-allowed",
                    )}
                  >
                    {IconComp && (
                      <IconComp
                        className={cn(
                          "size-3.5 shrink-0 transition-colors",
                          isSelected ? "text-primary" : "text-muted-foreground",
                        )}
                      />
                    )}
                    <span className="truncate">{optLabel}</span>
                  </button>
                );
              })}
            </div>
            {errors[f.name] && (
              <p className="text-[11px] text-destructive font-medium">
                {errors[f.name]}
              </p>
            )}
          </div>
        ) : f.type === "radio-cards" ? (
          <div className="space-y-2">
            {labelText && (
              <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                <span>
                  {labelText}
                  {isRequired && (
                    <span className="text-destructive ml-1" title="Verplicht">
                      *
                    </span>
                  )}
                </span>
              </div>
            )}
            <div
              className={cn(
                "grid gap-2.5",
                (f.options?.length || 0) === 2
                  ? "grid-cols-1 sm:grid-cols-2"
                  : "grid-cols-1",
              )}
            >
              {f.options?.map((opt) => {
                const optVal = typeof opt === "object" ? opt.value : opt;
                const optLabel = typeof opt === "object" ? opt.label : opt;
                const optDesc =
                  typeof opt === "object" ? opt.description : null;
                const isSelected = value === optVal;

                return (
                  <button
                    key={optVal}
                    type="button"
                    onClick={() => handleChange(f.name, optVal)}
                    disabled={f.disabled || isSubmitting}
                    className={cn(
                      "flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all duration-150 cursor-pointer active:scale-[0.99]",
                      isSelected
                        ? "border-primary bg-primary/10 ring-2 ring-primary/20 shadow-2xs"
                        : "border-border/80 bg-background/70 hover:bg-muted/40 hover:border-border",
                      f.disabled && "opacity-50 cursor-not-allowed",
                    )}
                  >
                    <div
                      className={cn(
                        "size-4.5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 transition-all",
                        isSelected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background",
                      )}
                    >
                      {isSelected && (
                        <span className="size-1.5 rounded-full bg-white" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className={cn(
                          "text-xs font-bold leading-tight",
                          isSelected ? "text-foreground" : "text-foreground/90",
                        )}
                      >
                        {optLabel}
                      </p>
                      {optDesc && (
                        <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                          {optDesc}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : f.type === "textarea" ? (
          <textarea
            id={`field-${f.name}`}
            rows={f.rows || 3}
            value={value}
            disabled={f.disabled || isSubmitting}
            placeholder={placeholderText}
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
              {placeholderText && (
                <option value="" disabled>
                  {placeholderText}
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
              className="size-4.5 rounded-md border-border text-primary accent-primary focus:ring-primary/20 cursor-pointer"
            />
            <div className="space-y-0.5">
              <span className="text-xs font-semibold text-foreground">
                {labelText}
              </span>
              {helperText && (
                <p className="text-[11px] text-muted-foreground">
                  {helperText}
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
              placeholder={placeholderText}
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

        {/* Quick Presets Pills (e.g. 14 dagen, 30 dagen) */}
        {f.presets && Array.isArray(f.presets) && (
          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
            {f.presets.map((preset) => {
              const pVal =
                typeof preset.value === "function"
                  ? preset.value(formValues)
                  : preset.value;
              const isSelected = value === pVal;
              return (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => handleChange(f.name, pVal)}
                  className={cn(
                    "px-2 py-0.5 rounded-md text-[10.5px] font-semibold border transition-all cursor-pointer active:scale-95",
                    isSelected
                      ? "border-primary/50 bg-primary/10 text-primary"
                      : "border-border/70 bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground",
                  )}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Helper or Error Text */}
        {errorMsg ? (
          <p className="text-[11px] text-destructive font-medium">{errorMsg}</p>
        ) : helperText && f.type !== "checkbox" ? (
          <p className="text-[11px] text-muted-foreground">{helperText}</p>
        ) : null}
      </div>
    );
  };

  const hasSteps = steps && steps.length > 1;

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth={maxWidth}>
      <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
        <ModalHeader title={title} description={description} icon={icon} />

        <ModalBody className="space-y-4">
          {/* Stepper Progress Bar (when multi-step is active) */}
          {hasSteps && (
            <div className="pb-3 border-b border-border/50 space-y-2">
              <div className="flex items-center justify-between relative px-2">
                {/* Background Connecting Line */}
                <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-0.5 bg-border/60 -z-0" />
                {/* Active Progress Line */}
                <div
                  className="absolute left-6 top-1/2 -translate-y-1/2 h-0.5 bg-primary transition-all duration-300 ease-out -z-0"
                  style={{
                    width: `${(currentStepIndex / (steps.length - 1)) * 82}%`,
                  }}
                />

                {steps.map((st, idx) => {
                  const isCompleted = idx < currentStepIndex;
                  const isCurrent = idx === currentStepIndex;

                  return (
                    <button
                      type="button"
                      key={st.id || idx}
                      onClick={() => {
                        if (idx < currentStepIndex) {
                          setCurrentStepIndex(idx);
                        }
                      }}
                      disabled={idx > currentStepIndex}
                      className={cn(
                        "relative z-10 flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all duration-200 select-none",
                        isCurrent &&
                          "bg-primary text-primary-foreground shadow-xs ring-4 ring-primary/15",
                        isCompleted &&
                          "bg-primary/15 text-primary border border-primary/30 cursor-pointer hover:bg-primary/25",
                        !isCurrent &&
                          !isCompleted &&
                          "bg-card text-muted-foreground border border-border/70 opacity-80",
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-4.5 items-center justify-center rounded-full text-[10px] font-bold",
                          isCurrent && "bg-primary-foreground text-primary",
                          isCompleted && "bg-primary text-primary-foreground",
                          !isCurrent &&
                            !isCompleted &&
                            "bg-muted text-muted-foreground",
                        )}
                      >
                        {isCompleted ? "✓" : idx + 1}
                      </span>
                      <span className="hidden sm:inline">{st.title}</span>
                    </button>
                  );
                })}
              </div>

              {steps[currentStepIndex]?.description && (
                <p className="text-[11.5px] text-muted-foreground pt-1 px-1">
                  {steps[currentStepIndex].description}
                </p>
              )}
            </div>
          )}

          {typeof children === "function"
            ? children({ currentStepIndex, formValues, handleChange })
            : children}

          {/* Step custom render or default fields grid */}
          {hasSteps &&
          typeof steps[currentStepIndex]?.renderStep === "function" ? (
            steps[currentStepIndex].renderStep(formValues, {
              handleChange,
              errors,
              setFormValues,
            })
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {fields.map(renderField)}
            </div>
          )}

          {footerNote && (
            <p className="text-[11px] text-muted-foreground/80 italic pt-1">
              {footerNote}
            </p>
          )}
        </ModalBody>

        <ModalFooter className="flex items-center justify-between gap-2">
          {/* Left action: Vorige (if in step > 0) or Cancel */}
          {hasSteps && currentStepIndex > 0 ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePrevStep}
              disabled={isSubmitting}
              className="rounded-full text-xs px-4 active:scale-95 transition-all cursor-pointer"
            >
              Vorige
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-full text-xs px-4 active:scale-95 transition-all cursor-pointer"
            >
              {cancelLabel}
            </Button>
          )}

          {/* Right action: Volgende (if not last step) or Submit */}
          {hasSteps && currentStepIndex < steps.length - 1 ? (
            <Button
              type="button"
              variant={submitVariant}
              size="sm"
              onClick={handleNextStep}
              disabled={isSubmitting}
              className="rounded-full text-xs font-semibold px-5 shadow-xs hover:shadow-md active:scale-95 transition-all cursor-pointer"
            >
              Volgende
            </Button>
          ) : (
            <Button
              type="submit"
              variant={submitVariant}
              size="sm"
              disabled={isSubmitting}
              className="rounded-full text-xs font-semibold px-5 shadow-xs hover:shadow-md active:scale-95 transition-all min-w-24 justify-center cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                  Opslaan...
                </>
              ) : (
                submitLabel
              )}
            </Button>
          )}
        </ModalFooter>
      </form>
    </Modal>
  );
}

export default FormModal;
