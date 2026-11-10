"use client";

import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal, ModalBody, ModalHeader } from "@/components/ui/modal";
import { useAuth } from "@/lib/auth/AuthContext";
import { useT } from "@/lib/preferences/PreferencesContext";
import {
  AUTH_MESSAGE_VARS,
  AUTH_RULES,
  validateLogin,
  validateRegister,
} from "@/schemas/authSchema";

export function AuthModal() {
  const t = useT();
  const router = useRouter();
  const {
    authModalOpen,
    authModalMode,
    setAuthModalMode,
    closeAuthModal,
    login,
    register,
    rateLimitCountdown,
    sessionExpired,
  } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isRegister = authModalMode === "register";

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setFieldErrors({});
    setServerError("");
    setSuccessMessage("");
  };

  const handleModeSwitch = (mode) => {
    setAuthModalMode(mode);
    setFieldErrors({});
    setServerError("");
    setSuccessMessage("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError("");
    setSuccessMessage("");

    if (rateLimitCountdown > 0) return;

    // Client-side validation
    const validation = isRegister
      ? validateRegister({ email, password, confirmPassword })
      : validateLogin({ email, password });

    if (!validation.isValid) {
      setFieldErrors(validation.errors);
      return;
    }
    setFieldErrors({});

    setIsSubmitting(true);
    try {
      if (isRegister) {
        await register({ email, password });
      } else {
        await login({ email, password });
      }
      resetForm();
      closeAuthModal();
      router.push("/dashboard");
    } catch (err) {
      setServerError(
        err?.message ||
          t(isRegister ? "auth.registerFailedText" : "auth.loginFailedText"),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={authModalOpen}
      onClose={() => {
        resetForm();
        closeAuthModal();
      }}
      maxWidth="md"
    >
      <ModalHeader
        title={isRegister ? t("auth.registerTitle") : t("auth.loginTitle")}
        description={
          isRegister ? t("auth.registerSubtitle") : t("auth.loginSubtitle")
        }
        icon={
          isRegister ? (
            <ShieldCheck className="size-5" />
          ) : (
            <KeyRound className="size-5" />
          )
        }
      />

      <ModalBody>
        {/* Logged out because the session ended */}
        {sessionExpired && !isRegister && !serverError && (
          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-medium animate-in fade-in">
            <Clock className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <div>
              <p className="font-semibold">{t("auth.sessionExpiredTitle")}</p>
              <p className="opacity-90">{t("auth.sessionExpiredText")}</p>
            </div>
          </div>
        )}

        {/* Rate limit warning banner */}
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

        {/* Server error alert */}
        {serverError && (
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium animate-in fade-in">
            <AlertCircle className="size-4 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">
                {isRegister ? t("auth.registerFailed") : t("auth.loginFailed")}
              </p>
              <p className="opacity-90">{serverError}</p>
            </div>
          </div>
        )}

        {/* Success message */}
        {successMessage && (
          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-medium animate-in fade-in">
            <CheckCircle2 className="size-4 shrink-0" />
            <p>{successMessage}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email field */}
          <div className="space-y-1.5">
            <label
              htmlFor="auth-email"
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
                id="auth-email"
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

          {/* Password field */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="auth-password"
                className="text-xs font-semibold text-foreground"
              >
                {t("auth.password")}
              </label>
              {isRegister && (
                <span className="text-[10px] text-muted-foreground">
                  {t("auth.passwordCount", {
                    count: password.length,
                    min: AUTH_RULES.PASSWORD_MIN_LENGTH,
                  })}
                </span>
              )}
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                id="auth-password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (fieldErrors.password) {
                    setFieldErrors((prev) => ({
                      ...prev,
                      password: undefined,
                    }));
                  }
                }}
                disabled={isSubmitting || rateLimitCountdown > 0}
                className="pl-9.5 pr-10"
                autoComplete={isRegister ? "new-password" : "current-password"}
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

          {/* Confirm Password (Register only) */}
          {isRegister && (
            <div className="space-y-1.5 animate-in fade-in">
              <label
                htmlFor="auth-confirm-password"
                className="text-xs font-semibold text-foreground flex items-center justify-between"
              >
                <span>{t("auth.confirmPassword")}</span>
                {fieldErrors.confirmPassword && (
                  <span className="text-[11px] text-destructive font-normal">
                    {t(fieldErrors.confirmPassword, AUTH_MESSAGE_VARS)}
                  </span>
                )}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  id="auth-confirm-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (fieldErrors.confirmPassword) {
                      setFieldErrors((prev) => ({
                        ...prev,
                        confirmPassword: undefined,
                      }));
                    }
                  }}
                  disabled={isSubmitting || rateLimitCountdown > 0}
                  className="pl-9.5"
                  autoComplete="new-password"
                  required
                />
              </div>
            </div>
          )}

          {/* Action Button */}
          <Button
            type="submit"
            disabled={isSubmitting || rateLimitCountdown > 0}
            className="w-full h-10 rounded-xl font-semibold gap-2 shadow-xs cursor-pointer mt-2"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="size-4 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" />
                <span>
                  {isRegister ? t("auth.registering") : t("auth.loggingIn")}
                </span>
              </span>
            ) : (
              <>
                <span>{isRegister ? t("auth.register") : t("auth.login")}</span>
                <ArrowRight className="size-4" />
              </>
            )}
          </Button>
        </form>

        {/* Toggle Mode */}
        <div className="pt-3 border-t border-border/50 text-center text-xs text-muted-foreground">
          {isRegister ? (
            <p>
              {t("auth.haveAccount")}{" "}
              <button
                type="button"
                onClick={() => handleModeSwitch("login")}
                className="font-semibold text-primary hover:underline cursor-pointer"
              >
                {t("auth.login")}
              </button>
            </p>
          ) : (
            <p>
              {t("auth.noAccount")}{" "}
              <button
                type="button"
                onClick={() => handleModeSwitch("register")}
                className="font-semibold text-primary hover:underline cursor-pointer"
              >
                {t("auth.register")}
              </button>
            </p>
          )}
        </div>
      </ModalBody>
    </Modal>
  );
}
