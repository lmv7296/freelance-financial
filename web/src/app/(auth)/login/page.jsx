"use client";

import {
  AlertCircle,
  ArrowRight,
  Clock,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Mail,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth/AuthContext";
import { useT } from "@/lib/preferences/PreferencesContext";
import { AUTH_MESSAGE_VARS, validateLogin } from "@/schemas/authSchema";

export default function LoginPage() {
  const t = useT();
  const router = useRouter();
  const { login, isAuthenticated, rateLimitCountdown } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError("");

    if (rateLimitCountdown > 0) return;

    const validation = validateLogin({ email, password });
    if (!validation.isValid) {
      setFieldErrors(validation.errors);
      return;
    }
    setFieldErrors({});

    setIsSubmitting(true);
    try {
      await login({ email, password });
      router.push("/dashboard");
    } catch (err) {
      setServerError(err?.message || t("auth.loginFailedText"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1.5 text-center">
        <div className="inline-flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 mb-2">
          <KeyRound className="size-5" />
        </div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">
          {t("auth.loginPageTitle")}
        </h1>
        <p className="text-xs text-muted-foreground">
          {t("auth.loginSubtitle")}
        </p>
      </div>

      {rateLimitCountdown > 0 && (
        <div className="flex items-center gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-medium animate-in fade-in">
          <Clock className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <div>
            <p className="font-semibold">{t("auth.rateLimitTitle")}</p>
            <p className="opacity-90">
              {t("auth.rateLimitText", { seconds: rateLimitCountdown })}
            </p>
          </div>
        </div>
      )}

      {serverError && (
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium animate-in fade-in">
          <AlertCircle className="size-4 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">{t("auth.loginFailed")}</p>
            <p className="opacity-90">{serverError}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email */}
        <div className="space-y-1.5">
          <label
            htmlFor="page-login-email"
            className="text-xs font-semibold text-foreground flex items-center justify-between"
          >
            <span>{t("auth.email")}</span>
            {fieldErrors.email && (
              <span className="text-[11px] text-destructive font-normal">
                {t(fieldErrors.email, AUTH_MESSAGE_VARS)}
              </span>
            )}
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              id="page-login-email"
              type="email"
              placeholder={t("auth.emailPlaceholder")}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (fieldErrors.email) {
                  setFieldErrors((prev) => ({ ...prev, email: undefined }));
                }
              }}
              disabled={isSubmitting || rateLimitCountdown > 0}
              className="pl-9.5"
              autoComplete="email"
              required
            />
          </div>
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <label
            htmlFor="page-login-password"
            className="text-xs font-semibold text-foreground"
          >
            {t("auth.password")}
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              id="page-login-password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (fieldErrors.password) {
                  setFieldErrors((prev) => ({ ...prev, password: undefined }));
                }
              }}
              disabled={isSubmitting || rateLimitCountdown > 0}
              className="pl-9.5 pr-10"
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
              title={
                showPassword ? t("auth.hidePassword") : t("auth.showPassword")
              }
            >
              {showPassword ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </button>
          </div>
          {fieldErrors.password && (
            <p className="text-[11px] text-destructive">
              {t(fieldErrors.password, AUTH_MESSAGE_VARS)}
            </p>
          )}
        </div>

        <Button
          type="submit"
          disabled={isSubmitting || rateLimitCountdown > 0}
          className="w-full h-10 rounded-xl font-semibold gap-2 shadow-xs cursor-pointer mt-2"
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <span className="size-4 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" />
              <span>{t("auth.loggingIn")}</span>
            </span>
          ) : (
            <>
              <span>{t("auth.login")}</span>
              <ArrowRight className="size-4" />
            </>
          )}
        </Button>
      </form>

      <div className="pt-4 border-t border-border/50 text-center text-xs text-muted-foreground">
        {t("auth.noAccount")}{" "}
        <Link
          href="/register"
          className="font-semibold text-primary hover:underline"
        >
          {t("auth.register")}
        </Link>
      </div>
    </div>
  );
}
