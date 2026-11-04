"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/AuthContext";
import { cn } from "@/lib/utils";
import { APP_FEATURES, WORKFLOW_STEPS } from "./data";

export function LandingFeatures() {
  const { isAuthenticated, openRegister, openLogin } = useAuth();

  return (
    <div className="space-y-28 pb-24">
      {/* 1. Core Feature Grid ("Wat kun je doen met FreelanceFin?") */}
      <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-14">
          <h2 className="text-xs font-bold uppercase tracking-wider text-primary">
            Wat kun je doen?
          </h2>
          <p className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            Alles wat een vakman nodig heeft. Niets wat in de weg zit.
          </p>
          <p className="text-sm text-muted-foreground">
            Geen overbodige boekhoudmodules of ingewikkelde balansen. Gewoon
            facturen, betalingen, bonnetjes en zicht op wat je aan de
            Belastingdienst moet betalen.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {APP_FEATURES.map((feature) => {
            return (
              <div
                key={feature.title}
                className="group relative rounded-2xl border border-border/70 bg-card p-6 shadow-xs hover:shadow-md hover:border-primary/40 transition-all duration-200 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {feature.badge}
                  </p>

                  <h3 className="text-base font-bold text-foreground">
                    {feature.title}
                  </h3>

                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </div>

                <p className="pt-4 mt-4 border-t border-border/50 text-[11px] font-semibold text-foreground">
                  {feature.highlight}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* 2. Step-by-Step Workflow ("Hoe het werkt in 3 stappen") */}
      <section
        id="how-it-works"
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
      >
        <div className="rounded-2xl border border-border/80 bg-muted/30 p-8 sm:p-12">
          <div className="text-center max-w-2xl mx-auto space-y-3 mb-12">
            <h2 className="text-xs font-bold uppercase tracking-wider text-primary">
              Simpele Werkwijze
            </h2>
            <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Van klus tot belastingaangifte
            </p>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Je administratie doe je meteen, op je telefoon. Niet achteraf
              achter een computer.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {WORKFLOW_STEPS.map((step) => {
              return (
                <div
                  key={step.step}
                  className="relative rounded-2xl bg-card border border-border/80 p-6 shadow-xs space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-black font-mono text-primary/30">
                        {step.step}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-foreground">
                      {step.title}
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {step.description}
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
            Geen administratieve stress meer. Begin vandaag.
          </h2>

          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Maak een account aan en zet je facturen, bonnetjes en btw op één
            plek.
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
                <span>Naar je Dashboard</span>
                <ArrowRight className="size-4" />
              </Link>
            ) : (
              <>
                <Button
                  size="lg"
                  onClick={openRegister}
                  className="w-full sm:w-auto rounded-full px-8 font-bold shadow-md hover:shadow-lg cursor-pointer h-11"
                >
                  <span>Account aanmaken</span>
                  <ArrowRight className="size-4 ml-2" />
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={openLogin}
                  className="w-full sm:w-auto rounded-full px-7 cursor-pointer h-11"
                >
                  <span>Inloggen</span>
                </Button>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
