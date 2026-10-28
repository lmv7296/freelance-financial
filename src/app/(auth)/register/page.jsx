"use client";

import {
  AlertCircle,
  ArrowRight,
  Clock,
  Eye,
  EyeOff,
  Lock,
  Mail,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth/AuthContext";
import { AUTH_RULES, validateRegister } from "@/schemas/authSchema";

export default function RegisterPage() {
  const router = useRouter();
  const { register, isAuthenticated, rateLimitCountdown } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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

    const validation = validateRegister({ email, password, confirmPassword });
    if (!validation.isValid) {
      setFieldErrors(validation.errors);
      return;
    }
    setFieldErrors({});

    setIsSubmitting(true);
    try {
      await register({ email, password });
      router.push("/dashboard");
    } catch (err) {
      setServerError(
        err?.message || "Registreren mislukt. Probeer het opnieuw.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1.5 text-center">
        <div className="inline-flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 mb-2">
          <ShieldCheck className="size-5" />
        </div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">
          Nieuw account aanmaken
        </h1>
        <p className="text-xs text-muted-foreground">
          Krijg direct controle over je administratie, offertes en facturen
        </p>
      </div>

      {rateLimitCountdown > 0 && (
        <div className="flex items-center gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-medium animate-in fade-in">
          <Clock className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <div>
            <p className="font-semibold">Te veel verzoeken</p>
            <p className="opacity-90">
              Wacht nog{" "}
              <span className="font-mono font-bold">{rateLimitCountdown}s</span>{" "}
              voor een nieuwe poging.
            </p>
          </div>
        </div>
      )}

      {serverError && (
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium animate-in fade-in">
          <AlertCircle className="size-4 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Fout bij registratie</p>
            <p className="opacity-90">{serverError}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email */}
        <div className="space-y-1.5">
          <label
            htmlFor="page-register-email"
            className="text-xs font-semibold text-foreground flex items-center justify-between"
          >
            <span>E-mailadres</span>
            {fieldErrors.email && (
              <span className="text-[11px] text-destructive font-normal">
                {fieldErrors.email}
              </span>
            )}
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              id="page-register-email"
              type="email"
              placeholder="naam@voorbeeld.nl"
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
          <div className="flex items-center justify-between">
            <label
              htmlFor="page-register-password"
              className="text-xs font-semibold text-foreground"
            >
              Wachtwoord
            </label>
            <span className="text-[10px] text-muted-foreground">
              {password.length}/{AUTH_RULES.PASSWORD_MIN_LENGTH}+ tekens (max.{" "}
              {AUTH_RULES.PASSWORD_MAX_LENGTH})
            </span>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              id="page-register-password"
              type={showPassword ? "text" : "password"}
              placeholder="Minimaal 8 tekens"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (fieldErrors.password) {
                  setFieldErrors((prev) => ({ ...prev, password: undefined }));
                }
              }}
              disabled={isSubmitting || rateLimitCountdown > 0}
              className="pl-9.5 pr-10"
              autoComplete="new-password"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
              title={showPassword ? "Verberg wachtwoord" : "Toon wachtwoord"}
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
              {fieldErrors.password}
            </p>
          )}
        </div>

        {/* Confirm Password */}
        <div className="space-y-1.5">
          <label
            htmlFor="page-register-confirm-password"
            className="text-xs font-semibold text-foreground flex items-center justify-between"
          >
            <span>Bevestig wachtwoord</span>
            {fieldErrors.confirmPassword && (
              <span className="text-[11px] text-destructive font-normal">
                {fieldErrors.confirmPassword}
              </span>
            )}
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              id="page-register-confirm-password"
              type={showPassword ? "text" : "password"}
              placeholder="Herhaal wachtwoord"
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

        <Button
          type="submit"
          disabled={isSubmitting || rateLimitCountdown > 0}
          className="w-full h-10 rounded-xl font-semibold gap-2 shadow-xs cursor-pointer mt-2"
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <span className="size-4 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" />
              <span>Account aanmaken...</span>
            </span>
          ) : (
            <>
              <span>Registreren</span>
              <ArrowRight className="size-4" />
            </>
          )}
        </Button>
      </form>

      <div className="pt-4 border-t border-border/50 text-center text-xs text-muted-foreground">
        Heb je al een account?{" "}
        <Link
          href="/login"
          className="font-semibold text-primary hover:underline"
        >
          Inloggen
        </Link>
      </div>
    </div>
  );
}
