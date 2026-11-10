import { cacheLife } from "next/cache";
import {
  LandingFeatures,
  LandingFooter,
  LandingHero,
  LandingNavbar,
} from "@/components/landing";

export const metadata = {
  title: "FreelanceFin — Facturen, bonnetjes & btw voor vakmensen en zzp'ers",
  description:
    "Maak je factuur direct na de klus, laat klanten betalen via iDEAL, stuur bonnetjes via WhatsApp en zie hoeveel btw en belasting je opzij moet zetten.",
};

export default async function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground font-sans antialiased selection:bg-primary/20 selection:text-primary">
      <LandingNavbar />
      <main className="flex-1">
        <LandingHero />
        <LandingFeatures />
      </main>
      <LandingFooter year={await getCopyrightYear()} />
    </div>
  );
}

// The year is captured into the static shell and refreshed daily, so it
// rolls over on its own without making the landing page dynamic.
async function getCopyrightYear() {
  "use cache";
  cacheLife("days");
  return new Date().getFullYear();
}
