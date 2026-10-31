"use client";

import {
  Check,
  Copy,
  Loader2,
  MessageCircle,
  Plus,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  FieldGroup,
  SettingsSection,
  TextField,
} from "@/components/settings/SettingsSection";
import { isValidPhone } from "@/components/settings/validators";
import { Button } from "@/components/ui/button";
import { settingsApi } from "@/lib/api/settings";
import { useT } from "@/lib/preferences/PreferencesContext";
import { cn } from "@/lib/utils";

/**
 * Phone numbers that may send receipts to the WhatsApp number. Changes apply immediately.
 */
export function WhatsAppSection() {
  const t = useT();
  const [settings, setSettings] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [copied, setCopied] = useState(false);

  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [addErrors, setAddErrors] = useState({});

  const reload = useCallback(async () => {
    setLoadError(null);
    try {
      const res = await settingsApi.getWhatsApp();
      setSettings({
        receiving_number: res?.receiving_number ?? null,
        senders: res?.senders ?? [],
      });
    } catch (err) {
      setLoadError(err);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const replaceSender = (sender) =>
    setSettings((prev) => ({
      ...prev,
      senders: prev.senders.map((s) => (s.id === sender.id ? sender : s)),
    }));

  const runAction = async (id, action) => {
    setBusyId(id);
    setActionError(null);
    try {
      await action();
    } catch (err) {
      setActionError(
        err?.isConflict
          ? t("settings.whatsapp.duplicate")
          : err?.message || t("settings.common.saveFailed"),
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleAdd = () => {
    const errors = {};
    if (!newName.trim()) errors.name = t("settings.whatsapp.nameRequired");
    if (!isValidPhone(newPhone))
      errors.phone = t("settings.whatsapp.phoneInvalid");
    setAddErrors(errors);
    if (Object.keys(errors).length) return;

    runAction("new", async () => {
      const res = await settingsApi.addWhatsAppSender({
        name: newName.trim(),
        phone: newPhone.replace(/[\s\-()]/g, ""),
      });
      if (res?.sender) {
        setSettings((prev) => ({
          ...prev,
          senders: [...prev.senders, res.sender],
        }));
      } else {
        await reload();
      }
      setNewName("");
      setNewPhone("");
    });
  };

  const handleCopy = () => {
    navigator.clipboard?.writeText(settings.receiving_number);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <SettingsSection
      title={t("settings.whatsapp.title")}
      description={t("settings.whatsapp.description")}
      icon={<MessageCircle className="size-5" />}
      resource={{ isLoading: !settings && !loadError, loadError, reload }}
      saveBar={false}
    >
      {settings && (
        <>
          <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3">
            <div>
              <p className="text-[11px] font-medium text-emerald-800 dark:text-emerald-200">
                {t("settings.whatsapp.receivingNumber")}
              </p>
              <p className="font-mono text-sm font-bold text-foreground">
                {settings.receiving_number ||
                  t("settings.whatsapp.notConfigured")}
              </p>
            </div>
            {settings.receiving_number && (
              <Button variant="outline" size="xs" onClick={handleCopy}>
                {copied ? <Check /> : <Copy />}
                {copied
                  ? t("settings.whatsapp.copied")
                  : t("settings.whatsapp.copy")}
              </Button>
            )}
          </div>

          <FieldGroup
            title={t("settings.whatsapp.sendersTitle")}
            description={t("settings.whatsapp.sendersHint")}
            columns={1}
          >
            {settings.senders.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border/70 px-3 py-2.5 text-[11px] text-muted-foreground">
                {t("settings.whatsapp.empty")}
              </p>
            ) : (
              <ul className="divide-y divide-border/50 rounded-xl border border-border/60">
                {settings.senders.map((sender) => (
                  <li
                    key={sender.id}
                    className={cn(
                      "flex flex-wrap items-center gap-3 px-3 py-2.5",
                      !sender.active && "opacity-60",
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-foreground">
                        {sender.name}
                      </p>
                      <p className="font-mono text-[11px] text-muted-foreground">
                        {sender.phone} •{" "}
                        {t("settings.whatsapp.receiptsCount", {
                          count: sender.receipts_count ?? 0,
                        })}
                      </p>
                    </div>
                    <label className="flex items-center gap-1.5 text-[11px] font-medium cursor-pointer">
                      <input
                        type="checkbox"
                        checked={sender.active}
                        disabled={busyId === sender.id}
                        onChange={(e) =>
                          runAction(sender.id, async () => {
                            const res = await settingsApi.updateWhatsAppSender(
                              sender.id,
                              { active: e.target.checked },
                            );
                            replaceSender(
                              res?.sender ?? {
                                ...sender,
                                active: e.target.checked,
                              },
                            );
                          })
                        }
                        className="size-4 accent-primary"
                      />
                      {t("settings.whatsapp.active")}
                    </label>
                    {confirmDeleteId === sender.id ? (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="destructive"
                          size="xs"
                          disabled={busyId === sender.id}
                          onClick={() =>
                            runAction(sender.id, async () => {
                              await settingsApi.removeWhatsAppSender(sender.id);
                              setSettings((prev) => ({
                                ...prev,
                                senders: prev.senders.filter(
                                  (s) => s.id !== sender.id,
                                ),
                              }));
                              setConfirmDeleteId(null);
                            })
                          }
                        >
                          {busyId === sender.id && (
                            <Loader2 className="animate-spin" />
                          )}
                          {t("settings.whatsapp.confirmRemove")}
                        </Button>
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => setConfirmDeleteId(null)}
                        >
                          {t("settings.common.cancel")}
                        </Button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(sender.id)}
                        className="size-7 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors cursor-pointer"
                        title={t("settings.whatsapp.remove")}
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </FieldGroup>

          <FieldGroup title={t("settings.whatsapp.addTitle")}>
            <TextField
              label={t("settings.whatsapp.name")}
              placeholder={t("settings.whatsapp.namePlaceholder")}
              value={newName}
              onChange={setNewName}
              error={addErrors.name}
            />
            <TextField
              label={t("settings.whatsapp.phone")}
              type="tel"
              placeholder="+31 6 1234 5678"
              value={newPhone}
              onChange={setNewPhone}
              error={addErrors.phone}
            />
            <div className="sm:col-span-2 flex items-center gap-3">
              <Button size="sm" onClick={handleAdd} disabled={busyId === "new"}>
                {busyId === "new" ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Plus />
                )}
                {t("settings.whatsapp.add")}
              </Button>
              {actionError && (
                <p className="text-[11px] font-medium text-destructive">
                  {actionError}
                </p>
              )}
            </div>
          </FieldGroup>
        </>
      )}
    </SettingsSection>
  );
}

export default WhatsAppSection;
