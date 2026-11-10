"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Sidebar } from "@/components/Sidebar";
import { VerifyEmailBanner } from "@/components/VerifyEmailBanner";
import { useAuth } from "@/lib/auth/AuthContext";
import { isProfileComplete } from "@/lib/auth/profile";
import { useT } from "@/lib/preferences/PreferencesContext";

export default function PagesLayout({ children }) {
  const { user, isAuthenticated, isLoading, sessionExpired, openLogin } =
    useAuth();
  const t = useT();
  const router = useRouter();
  const needsOnboarding = isAuthenticated && !isProfileComplete(user);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      // Redirect unauthenticated visitors to the public landing page
      router.replace(sessionExpired ? "/?auth=expired" : "/?auth=required");
      openLogin();
    } else if (needsOnboarding) {
      router.replace("/onboarding");
    }
  }, [
    isLoading,
    isAuthenticated,
    needsOnboarding,
    sessionExpired,
    router,
    openLogin,
  ]);

  // Loading state while checking authentication credentials
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground gap-3">
        <div className="size-9 rounded-full border-3 border-primary border-t-transparent animate-spin" />
        <p className="text-xs font-semibold text-muted-foreground animate-pulse">
          {t("common.checkingAccess")}
        </p>
      </div>
    );
  }

  // Prevent flash of protected UI content while redirecting
  if (!isAuthenticated || needsOnboarding) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-background font-sans">
      <Sidebar />
      <main className="flex-1 min-w-0 overflow-y-auto">
        <VerifyEmailBanner />
        {children}
      </main>
    </div>
  );
}
