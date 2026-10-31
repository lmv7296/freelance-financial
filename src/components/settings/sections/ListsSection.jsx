"use client";

import { ArrowDown, ArrowUp, ListChecks, Plus, X } from "lucide-react";
import { useState } from "react";
import {
  FieldGroup,
  SettingsSection,
  selectClassName,
} from "@/components/settings/SettingsSection";
import { useSettingsResource } from "@/components/settings/useSettingsResource";
import { Input } from "@/components/ui/input";
import { configApi } from "@/lib/api/config";
import { settingsApi } from "@/lib/api/settings";
import { useT } from "@/lib/preferences/PreferencesContext";
import { cn } from "@/lib/utils";

// Payment methods may arrive as plain strings or as { value, label } objects
const toLabel = (item) =>
  typeof item === "object" && item !== null
    ? item.label || item.value || ""
    : String(item ?? "");

const loadLists = async () => {
  const res = await settingsApi.getLists();
  const lists = res?.lists ?? {};
  return {
    merchants: (lists.merchants ?? []).map((m) => ({
      name: m.name ?? "",
      category: m.category ?? null,
    })),
    categories: (lists.categories ?? []).map(toLabel),
    payment_methods: (lists.payment_methods ?? []).map(toLabel),
  };
};

const saveLists = async (payload) => {
  const res = await settingsApi.updateLists(payload);
  // Refresh the cached /api/v1/config so "Nieuwe uitgave" shows the new lists right away
  configApi.fetchConfig().catch(() => {});
  return res?.lists ?? payload;
};

const toDraft = (lists) => structuredClone(lists);

const fromDraft = (draft) => ({
  merchants: draft.merchants.map((m) => ({
    name: m.name.trim(),
    category: m.category || null,
  })),
  categories: draft.categories.map((c) => c.trim()),
  payment_methods: draft.payment_methods.map((p) => p.trim()),
});

/** Index of the first empty or duplicate (case-insensitive) entry, or -1 */
function findInvalid(values) {
  const seen = new Set();
  return values.findIndex((value) => {
    const key = value.trim().toLowerCase();
    if (!key || seen.has(key)) return true;
    seen.add(key);
    return false;
  });
}

function move(list, index, delta) {
  const target = index + delta;
  if (target < 0 || target >= list.length) return list;
  const next = [...list];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

export function ListsSection() {
  const t = useT();
  const resource = useSettingsResource({
    load: loadLists,
    save: saveLists,
    toDraft,
    fromDraft,
  });
  const { draft, setDraft } = resource;
  const [showErrors, setShowErrors] = useState(false);

  const errors = draft
    ? {
        merchants: findInvalid(draft.merchants.map((m) => m.name)),
        categories: findInvalid(draft.categories),
        payment_methods: findInvalid(draft.payment_methods),
      }
    : {};
  const hasErrors = Object.values(errors).some((i) => i !== -1);

  const handleSave = () => {
    setShowErrors(true);
    if (!hasErrors) resource.submit();
  };

  // Keep quick-select shops pointing at a category when it's renamed or removed
  const renameCategory = (index, value) =>
    setDraft((prev) => {
      const old = prev.categories[index];
      return {
        ...prev,
        categories: prev.categories.map((c, i) => (i === index ? value : c)),
        merchants: prev.merchants.map((m) =>
          m.category === old ? { ...m, category: value } : m,
        ),
      };
    });

  const removeCategory = (index) =>
    setDraft((prev) => {
      const old = prev.categories[index];
      return {
        ...prev,
        categories: prev.categories.filter((_, i) => i !== index),
        merchants: prev.merchants.map((m) =>
          m.category === old ? { ...m, category: null } : m,
        ),
      };
    });

  const errorFor = (key) =>
    showErrors && errors[key] !== -1 ? t("settings.lists.invalidEntry") : null;

  return (
    <SettingsSection
      title={t("settings.lists.title")}
      description={t("settings.lists.description")}
      icon={<ListChecks className="size-5" />}
      resource={resource}
      onSave={handleSave}
    >
      {draft && (
        <>
          <FieldGroup
            title={t("settings.lists.merchantsTitle")}
            description={t("settings.lists.merchantsHint")}
            columns={1}
          >
            <QuickSelectPreview merchants={draft.merchants} />
            <ul className="space-y-1.5">
              {draft.merchants.map((merchant, index) => (
                <li
                  // biome-ignore lint/suspicious/noArrayIndexKey: rows are edited in place and have no id
                  key={index}
                  className="flex flex-wrap items-center gap-2 sm:flex-nowrap"
                >
                  <Input
                    aria-label={t("settings.lists.merchantName")}
                    value={merchant.name}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        merchants: prev.merchants.map((m, i) =>
                          i === index ? { ...m, name: e.target.value } : m,
                        ),
                      }))
                    }
                    className={cn(
                      "h-8.5 min-w-32 flex-1 text-xs",
                      showErrors &&
                        errors.merchants === index &&
                        "border-destructive",
                    )}
                  />
                  <select
                    aria-label={t("settings.lists.defaultCategory")}
                    value={merchant.category ?? ""}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        merchants: prev.merchants.map((m, i) =>
                          i === index
                            ? { ...m, category: e.target.value || null }
                            : m,
                        ),
                      }))
                    }
                    className={cn(
                      selectClassName,
                      "h-8.5 w-auto min-w-0 flex-1 text-xs sm:max-w-48",
                    )}
                  >
                    <option value="">{t("settings.lists.noCategory")}</option>
                    {draft.categories
                      .filter((c) => c.trim())
                      .map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                  </select>
                  <RowActions
                    isFirst={index === 0}
                    isLast={index === draft.merchants.length - 1}
                    onMove={(delta) =>
                      setDraft((prev) => ({
                        ...prev,
                        merchants: move(prev.merchants, index, delta),
                      }))
                    }
                    onRemove={() =>
                      setDraft((prev) => ({
                        ...prev,
                        merchants: prev.merchants.filter((_, i) => i !== index),
                      }))
                    }
                  />
                </li>
              ))}
            </ul>
            {errorFor("merchants") && (
              <p className="text-[11px] font-medium text-destructive">
                {errorFor("merchants")}
              </p>
            )}
            <AddButton
              label={t("settings.lists.addMerchant")}
              onClick={() =>
                setDraft((prev) => ({
                  ...prev,
                  merchants: [...prev.merchants, { name: "", category: null }],
                }))
              }
            />
          </FieldGroup>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <StringListEditor
              title={t("settings.lists.categoriesTitle")}
              hint={t("settings.lists.categoriesHint")}
              items={draft.categories}
              invalidIndex={showErrors ? errors.categories : -1}
              error={errorFor("categories")}
              addLabel={t("settings.lists.addCategory")}
              onChange={renameCategory}
              onRemove={removeCategory}
              onMove={(index, delta) =>
                setDraft((prev) => ({
                  ...prev,
                  categories: move(prev.categories, index, delta),
                }))
              }
              onAdd={() =>
                setDraft((prev) => ({
                  ...prev,
                  categories: [...prev.categories, ""],
                }))
              }
            />
            <StringListEditor
              title={t("settings.lists.paymentMethodsTitle")}
              hint={t("settings.lists.paymentMethodsHint")}
              items={draft.payment_methods}
              invalidIndex={showErrors ? errors.payment_methods : -1}
              error={errorFor("payment_methods")}
              addLabel={t("settings.lists.addPaymentMethod")}
              onChange={(index, value) =>
                setDraft((prev) => ({
                  ...prev,
                  payment_methods: prev.payment_methods.map((p, i) =>
                    i === index ? value : p,
                  ),
                }))
              }
              onRemove={(index) =>
                setDraft((prev) => ({
                  ...prev,
                  payment_methods: prev.payment_methods.filter(
                    (_, i) => i !== index,
                  ),
                }))
              }
              onMove={(index, delta) =>
                setDraft((prev) => ({
                  ...prev,
                  payment_methods: move(prev.payment_methods, index, delta),
                }))
              }
              onAdd={() =>
                setDraft((prev) => ({
                  ...prev,
                  payment_methods: [...prev.payment_methods, ""],
                }))
              }
            />
          </div>
        </>
      )}
    </SettingsSection>
  );
}

/** How the shops will look in "Nieuwe uitgave toevoegen" */
function QuickSelectPreview({ merchants }) {
  const t = useT();
  const named = merchants.filter((m) => m.name.trim());
  return (
    <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 p-3">
      <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {t("settings.lists.preview")}
      </p>
      {named.length === 0 ? (
        <p className="text-[11px] text-muted-foreground">
          {t("settings.lists.previewEmpty")}
        </p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {named.map((m, index) => (
            <span
              // biome-ignore lint/suspicious/noArrayIndexKey: names may repeat while editing
              key={index}
              className="rounded-full border border-border/70 bg-muted/40 px-2.5 py-1 text-[11px] font-semibold text-muted-foreground"
            >
              {m.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function StringListEditor({
  title,
  hint,
  items,
  invalidIndex,
  error,
  addLabel,
  onChange,
  onRemove,
  onMove,
  onAdd,
}) {
  return (
    <FieldGroup title={title} description={hint} columns={1}>
      <ul className="space-y-1.5">
        {items.map((item, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: rows are edited in place and have no id
          <li key={index} className="flex items-center gap-2">
            <Input
              aria-label={title}
              value={item}
              onChange={(e) => onChange(index, e.target.value)}
              className={cn(
                "h-8.5 min-w-0 flex-1 text-xs",
                invalidIndex === index && "border-destructive",
              )}
            />
            <RowActions
              isFirst={index === 0}
              isLast={index === items.length - 1}
              onMove={(delta) => onMove(index, delta)}
              onRemove={() => onRemove(index)}
            />
          </li>
        ))}
      </ul>
      {error && (
        <p className="text-[11px] font-medium text-destructive">{error}</p>
      )}
      <AddButton label={addLabel} onClick={onAdd} />
    </FieldGroup>
  );
}

function RowActions({ isFirst, isLast, onMove, onRemove }) {
  const t = useT();
  const buttonClass =
    "size-7 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground active:scale-90 transition-all cursor-pointer disabled:opacity-30 disabled:pointer-events-none";
  return (
    <div className="flex shrink-0 items-center">
      <button
        type="button"
        onClick={() => onMove(-1)}
        disabled={isFirst}
        className={buttonClass}
        title={t("settings.lists.moveUp")}
      >
        <ArrowUp className="size-3.5" />
      </button>
      <button
        type="button"
        onClick={() => onMove(1)}
        disabled={isLast}
        className={buttonClass}
        title={t("settings.lists.moveDown")}
      >
        <ArrowDown className="size-3.5" />
      </button>
      <button
        type="button"
        onClick={onRemove}
        className={cn(
          buttonClass,
          "hover:bg-destructive/10 hover:text-destructive",
        )}
        title={t("settings.lists.remove")}
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}

function AddButton({ label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold text-primary hover:bg-primary/10 active:scale-95 transition-all cursor-pointer"
    >
      <Plus className="size-3" />
      {label}
    </button>
  );
}

export default ListsSection;
