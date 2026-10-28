"use client";

import { ArrowRight, CheckCircle2, Quote, Sparkles } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  APP_FEATURES,
  TESTIMONIAL,
  WORKFLOW_STEPS,
} from "@/data/landingFeatures";
import { useAuth } from "@/lib/auth/AuthContext";

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
            snelle facturen, directe betalingen en bescherming tegen onverwachte
            belastingaanslagen.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {APP_FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="group relative rounded-2xl border border-border/70 bg-card p-6 shadow-xs hover:shadow-md hover:border-primary/40 transition-all duration-200 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 group-hover:scale-105 transition-transform duration-200">
                      <Icon className="size-5" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border/60">
                      {feature.badge}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-foreground">
                    {feature.title}
                  </h3>

                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t border-border/50 flex items-center gap-1.5 text-[11px] font-semibold text-primary">
                  <CheckCircle2 className="size-3.5" />
                  <span>{feature.highlight}</span>
                </div>
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
        <div className="rounded-3xl border border-border/80 bg-gradient-to-b from-muted/50 to-muted/20 p-8 sm:p-12">
          <div className="text-center max-w-2xl mx-auto space-y-3 mb-12">
            <h2 className="text-xs font-bold uppercase tracking-wider text-primary">
              Simpele Werkwijze
            </h2>
            <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Van gereedschap opruimen tot geld op je rekening
            </p>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Geen gedoe achteraf achter een computer. Binnen 60 seconden na de
              klus ben je klaar.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {WORKFLOW_STEPS.map((step) => {
              const Icon = step.icon;
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
                      <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Icon className="size-4.5" />
                      </div>
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

      {/* 3. Tradesperson Story / Testimonial */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="relative rounded-3xl border border-border/80 bg-card p-8 sm:p-10 shadow-lg overflow-hidden">
          <Quote className="absolute right-6 top-6 size-24 text-muted/30 -z-0 pointer-events-none" />
          <div className="relative z-10 space-y-4">
            <p className="text-sm sm:text-base italic text-foreground leading-relaxed font-serif">
              "{TESTIMONIAL.quote}"
            </p>
            <div className="pt-2 flex items-center gap-3">
              <div className="size-10 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs">
                DV
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">
                  {TESTIMONIAL.author}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {TESTIMONIAL.role} • {TESTIMONIAL.kvk}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Bottom Call To Action */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="rounded-3xl border border-primary/30 bg-gradient-to-tr from-primary/15 via-primary/5 to-muted/40 p-8 sm:p-14 text-center space-y-6 shadow-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/15 text-primary text-xs font-semibold">
            <Sparkles className="size-3.5" />
            <span>Klaar om direct te starten?</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground max-w-xl mx-auto">
            Geen administratieve stress meer. Begin vandaag.
          </h2>

          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Maak gratis een account aan en ervaar het gemak van mobiele
            facturatie en een automatische BTW-Kluis.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            {isAuthenticated ? (
              <Button
                size="lg"
                asChild
                className="rounded-full px-8 font-bold shadow-md cursor-pointer"
              >
                <Link href="/dashboard" className="flex items-center gap-2">
                  <span>Naar je Dashboard</span>
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
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
