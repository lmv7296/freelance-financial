"use client";

import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { profileApi } from "@/lib/api/profile";
import { useAuth } from "@/lib/auth/AuthContext";
import { useT } from "@/lib/preferences/PreferencesContext";
import { cn } from "@/lib/utils";

/**
 * Opened from the link in the verification email: /verify-email?token=...
 */
export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<Checking />}>
      <VerifyEmail />
    </Suspense>
  );
}

function Checking() {
  const t = useT();
  return (
    <div className="flex flex-col items-center gap-3 py-6 text-center">
      <Loader2 className="size-7 animate-spin text-muted-foreground" />
      <p className="text-xs text-muted-foreground">
        {t("verifyEmail.checking")}
      </p>
    </div>
  );
}

function VerifyEmail() {
  const t = useT();
  const token = useSearchParams().get("token");
  const { user, isAuthenticated, isLoading, updateUser } = useAuth();
  const [status, setStatus] = useState(token ? "checking" : "missing");
  const [message, setMessage] = useState(null);
  // The token works only once, so never send it twice (React dev mode runs effects twice)
  const sentRef = useRef(false);

  useEffect(() => {
    if (!token || isLoading || sentRef.current) return;
    sentRef.current = true;
    profileApi
      .verifyEmail(token)
      .then((res) => {
        if (isAuthenticated && user) {
          updateUser(res?.user ?? { ...user, is_verified: true });
        }
        setStatus("success");
      })
      .catch((err) => {
        setMessage(err?.message || null);
        setStatus("failed");
      });
  }, [token, isLoading, isAuthenticated, user, updateUser]);

  if (status === "checking") return <Checking />;

  const succeeded = status === "success";
  return (
    <div className="flex flex-col items-center gap-3 py-2 text-center">
      {succeeded ? (
        <CheckCircle2 className="size-9 text-emerald-500" />
      ) : (
        <XCircle className="size-9 text-destructive" />
      )}
      <h1 className="text-base font-bold text-foreground">
        {succeeded
          ? t("verifyEmail.successTitle")
          : t("verifyEmail.failedTitle")}
      </h1>
      <p className="text-xs text-muted-foreground">
        {succeeded
          ? t("verifyEmail.successText")
          : status === "missing"
            ? t("verifyEmail.missingToken")
            : t("verifyEmail.failedText")}
      </p>
      {message && !succeeded && (
        <p className="text-[11px] text-muted-foreground/80">{message}</p>
      )}
      <Link
        href={isAuthenticated ? "/dashboard" : "/"}
        className={cn(buttonVariants({ size: "sm" }), "mt-2 rounded-xl")}
      >
        {isAuthenticated
          ? t("verifyEmail.toDashboard")
          : t("verifyEmail.toHome")}
      </Link>
    </div>
  );
}
