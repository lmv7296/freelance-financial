"use client";

import { Check, KeyRound, Loader2, LogOut, ShieldCheck } from "lucide-react";
import { useState } from "react";
import {
  FieldGroup,
  SettingsSection,
  TextField,
} from "@/components/settings/SettingsSection";
import { isValidEmail } from "@/components/settings/validators";
import { Button } from "@/components/ui/button";
import { settingsApi } from "@/lib/api/settings";
import { useAuth } from "@/lib/auth/AuthContext";
import { useT } from "@/lib/preferences/PreferencesContext";
import { AUTH_RULES } from "@/schemas/authSchema";

export function AccountSection() {
  const t = useT();
  const { user, logout } = useAuth();

  return (
    <SettingsSection
      title={t("settings.account.title")}
      description={t("settings.account.description")}
      icon={<ShieldCheck className="size-5" />}
    >
      <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
        <p className="text-[11px] font-medium text-muted-foreground">
          {t("settings.account.currentEmail")}
        </p>
        <p className="text-sm font-semibold text-foreground">{user?.email}</p>
      </div>
      <ChangeEmailForm />
      <ChangePasswordForm />
      <LogoutEverywhere onDone={logout} />
    </SettingsSection>
  );
}

function ChangeEmailForm() {
  const t = useT();
  const [newEmail, setNewEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle"); // idle | saving | done

  const handleSubmit = async () => {
    const next = {};
    if (!isValidEmail(newEmail))
      next.newEmail = t("settings.account.emailInvalid");
    if (!password) next.password = t("settings.account.passwordRequired");
    setErrors(next);
    if (Object.keys(next).length) return;

    setStatus("saving");
    try {
      await settingsApi.changeEmail({
        new_email: newEmail.trim(),
        current_password: password,
      });
      setStatus("done");
      setNewEmail("");
      setPassword("");
    } catch (err) {
      setStatus("idle");
      setErrors(
        err?.isUnauthorized
          ? { password: t("settings.account.wrongPassword") }
          : err?.isConflict
            ? { newEmail: t("settings.account.emailTaken") }
            : { form: err?.message || t("settings.common.saveFailed") },
      );
    }
  };

  return (
    <FieldGroup title={t("settings.account.changeEmail")}>
      <TextField
        label={t("settings.account.newEmail")}
        type="email"
        autoComplete="email"
        value={newEmail}
        onChange={setNewEmail}
        error={errors.newEmail}
      />
      <TextField
        label={t("settings.account.currentPassword")}
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={setPassword}
        error={errors.password}
      />
      <FormFooter
        status={status}
        error={errors.form}
        doneLabel={t("settings.account.emailChanged")}
        submitLabel={t("settings.account.changeEmail")}
        onSubmit={handleSubmit}
      />
    </FieldGroup>
  );
}

function ChangePasswordForm() {
  const t = useT();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle");

  const handleSubmit = async () => {
    const found = {};
    if (!current) found.current = t("settings.account.passwordRequired");
    if (next.length < AUTH_RULES.PASSWORD_MIN_LENGTH)
      found.next = t("settings.account.passwordTooShort", {
        count: AUTH_RULES.PASSWORD_MIN_LENGTH,
      });
    else if (next.length > AUTH_RULES.PASSWORD_MAX_LENGTH)
      found.next = t("settings.account.passwordTooLong", {
        count: AUTH_RULES.PASSWORD_MAX_LENGTH,
      });
    if (confirm !== next)
      found.confirm = t("settings.account.passwordMismatch");
    setErrors(found);
    if (Object.keys(found).length) return;

    setStatus("saving");
    try {
      await settingsApi.changePassword({
        current_password: current,
        new_password: next,
      });
      setStatus("done");
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch (err) {
      setStatus("idle");
      setErrors(
        err?.isUnauthorized
          ? { current: t("settings.account.wrongPassword") }
          : { form: err?.message || t("settings.common.saveFailed") },
      );
    }
  };

  return (
    <FieldGroup
      title={t("settings.account.changePassword")}
      description={t("settings.account.changePasswordHint")}
    >
      <TextField
        label={t("settings.account.currentPassword")}
        type="password"
        autoComplete="current-password"
        className="sm:col-span-2"
        value={current}
        onChange={setCurrent}
        error={errors.current}
      />
      <TextField
        label={t("settings.account.newPassword")}
        type="password"
        autoComplete="new-password"
        value={next}
        onChange={setNext}
        error={errors.next}
      />
      <TextField
        label={t("settings.account.confirmPassword")}
        type="password"
        autoComplete="new-password"
        value={confirm}
        onChange={setConfirm}
        error={errors.confirm}
      />
      <FormFooter
        status={status}
        error={errors.form}
        doneLabel={t("settings.account.passwordChanged")}
        submitLabel={t("settings.account.changePassword")}
        icon={<KeyRound />}
        onSubmit={handleSubmit}
      />
    </FieldGroup>
  );
}

function LogoutEverywhere({ onDone }) {
  const t = useT();
  const [isConfirming, setIsConfirming] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState(null);

  const handleConfirm = async () => {
    setIsBusy(true);
    setError(null);
    try {
      await settingsApi.logoutAllSessions();
      await onDone();
    } catch (err) {
      setError(err?.message || t("settings.common.saveFailed"));
      setIsBusy(false);
    }
  };

  return (
    <FieldGroup
      title={t("settings.account.sessions")}
      description={t("settings.account.sessionsHint")}
      columns={1}
    >
      <div className="flex flex-wrap items-center gap-2">
        {isConfirming ? (
          <>
            <span className="text-xs font-medium text-destructive">
              {t("settings.account.logoutAllConfirm")}
            </span>
            <Button
              variant="destructive"
              size="sm"
              disabled={isBusy}
              onClick={handleConfirm}
            >
              {isBusy ? <Loader2 className="animate-spin" /> : <LogOut />}
              {t("settings.account.logoutAllYes")}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={isBusy}
              onClick={() => setIsConfirming(false)}
            >
              {t("settings.common.cancel")}
            </Button>
          </>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsConfirming(true)}
          >
            <LogOut />
            {t("settings.account.logoutAll")}
          </Button>
        )}
      </div>
      {error && (
        <p className="text-[11px] font-medium text-destructive">{error}</p>
      )}
    </FieldGroup>
  );
}

function FormFooter({ status, error, doneLabel, submitLabel, icon, onSubmit }) {
  return (
    <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
      <Button
        size="sm"
        variant="outline"
        onClick={onSubmit}
        disabled={status === "saving"}
      >
        {status === "saving" ? <Loader2 className="animate-spin" /> : icon}
        {submitLabel}
      </Button>
      {status === "done" && (
        <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
          <Check className="size-3.5" />
          {doneLabel}
        </span>
      )}
      {error && (
        <span className="text-[11px] font-medium text-destructive">
          {error}
        </span>
      )}
    </div>
  );
}

export default AccountSection;
