"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/AuthContext";
import { useT } from "@/lib/preferences/PreferencesContext";
import { cn } from "@/lib/utils";
import { APP_FEATURES, WORKFLOW_STEPS } from "./data";

export function LandingFeatures() {
  const t = useT();
  const { isAuthenticated, openRegister, openLogin } = useAuth();

  return (
    <div className="space-y-28 pb-24">
      {/* 1. Feature grid */}
      <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-14">
          <h2 className="text-xs font-bold uppercase tracking-wider text-primary">
            {t("landing.features.eyebrow")}
          </h2>
          <p className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            {t("landing.features.title")}
          </p>
          <p className="text-sm text-muted-foreground">
            {t("landing.features.subtitle")}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {APP_FEATURES.map((key) => {
            const item = (field) => t(`landing.features.items.${key}.${field}`);
            return (
              <div
                key={key}
                className="group relative rounded-2xl border border-border/70 bg-card p-6 shadow-xs hover:shadow-md hover:border-primary/40 transition-all duration-200 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {item("badge")}
                  </p>

                  <h3 className="text-base font-bold text-foreground">
                    {item("title")}
                  </h3>

                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {item("description")}
                  </p>
                </div>

                <p className="pt-4 mt-4 border-t border-border/50 text-[11px] font-semibold text-foreground">
                  {item("highlight")}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* 2. How it works */}
      <section
        id="how-it-works"
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
      >
        <div className="rounded-2xl border border-border/80 bg-muted/30 p-8 sm:p-12">
          <div className="text-center max-w-2xl mx-auto space-y-3 mb-12">
            <h2 className="text-xs font-bold uppercase tracking-wider text-primary">
              {t("landing.steps.eyebrow")}
            </h2>
            <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              {t("landing.steps.title")}
            </p>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {t("landing.steps.subtitle")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {WORKFLOW_STEPS.map((key, index) => {
              return (
                <div
                  key={key}
                  className="relative rounded-2xl bg-card border border-border/80 p-6 shadow-xs space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-black font-mono text-primary/30">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-foreground">
                      {t(`landing.steps.items.${key}.title`)}
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {t(`landing.steps.items.${key}.description`)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 3. Bottom Call To Action */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="rounded-2xl border border-border/80 bg-muted/30 p-8 sm:p-14 text-center space-y-6">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground max-w-xl mx-auto">
            {t("landing.cta.title")}
          </h2>

          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            {t("landing.cta.subtitle")}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            {isAuthenticated ? (
              <Link
                href="/dashboard"
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "rounded-full px-8 font-bold shadow-md",
                )}
              >
                <span>{t("landing.cta.toDashboard")}</span>
                <ArrowRight className="size-4" />
              </Link>
            ) : (
              <>
                <Button
                  size="lg"
                  onClick={openRegister}
                  className="w-full sm:w-auto rounded-full px-8 font-bold shadow-md hover:shadow-lg cursor-pointer h-11"
                >
                  <span>{t("landing.cta.register")}</span>
                  <ArrowRight className="size-4 ml-2" />
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={openLogin}
                  className="w-full sm:w-auto rounded-full px-7 cursor-pointer h-11"
                >
                  <span>{t("landing.cta.login")}</span>
                </Button>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
