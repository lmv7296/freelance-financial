"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Sidebar } from "@/components/Sidebar";
import { useAuth } from "@/lib/auth/AuthContext";

export default function PagesLayout({ children }) {
  const { isAuthenticated, isLoading, openLogin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // Redirect unauthenticated visitors to the public landing page
      router.replace("/?auth=required");
      openLogin();
    }
  }, [isLoading, isAuthenticated, router, openLogin]);

  // Loading state while checking authentication credentials
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground gap-3">
        <div className="size-9 rounded-full border-3 border-primary border-t-transparent animate-spin" />
        <p className="text-xs font-semibold text-muted-foreground animate-pulse">
          Toegang controleren...
        </p>
      </div>
    );
  }

  // Prevent flash of protected UI content while redirecting
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-background font-sans">
      <Sidebar />
      <main className="flex-1 min-w-0 overflow-y-auto">{children}</main>
    </div>
  );
}
