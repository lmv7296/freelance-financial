"use client";

import { Loader2, MailWarning, Send } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { profileApi } from "@/lib/api/profile";
import { useAuth } from "@/lib/auth/AuthContext";
import { useT } from "@/lib/preferences/PreferencesContext";

/**
 * Reminder to confirm the email address. The app stays usable meanwhile.
 * Only shown when the backend explicitly says the user is not verified.
 */
export function VerifyEmailBanner() {
  const t = useT();
  const { user } = useAuth();
  const [status, setStatus] = useState("idle"); // idle | sending | sent | failed

  if (user?.is_verified !== false) return null;

  const handleResend = async () => {
    setStatus("sending");
    try {
      await profileApi.resendVerification();
      setStatus("sent");
    } catch {
      setStatus("failed");
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2.5 sm:px-6">
      <MailWarning className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
      <p className="min-w-0 flex-1 text-xs text-amber-800 dark:text-amber-200">
        <span className="font-semibold">{t("verifyEmail.bannerTitle")}.</span>{" "}
        {t("verifyEmail.bannerText", { email: user.email })}
      </p>
      {status === "sent" ? (
        <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
          {t("verifyEmail.resent")}
        </span>
      ) : (
        <div className="flex items-center gap-2">
          {status === "failed" && (
            <span className="text-[11px] font-medium text-destructive">
              {t("verifyEmail.resendFailed")}
            </span>
          )}
          <Button
            variant="outline"
            size="xs"
            onClick={handleResend}
            disabled={status === "sending"}
          >
            {status === "sending" ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Send />
            )}
            {status === "sending"
              ? t("verifyEmail.resending")
              : t("verifyEmail.resend")}
          </Button>
        </div>
      )}
    </div>
  );
}

export default VerifyEmailBanner;
