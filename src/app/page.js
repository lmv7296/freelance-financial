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

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground font-sans antialiased selection:bg-primary/20 selection:text-primary">
      <LandingNavbar />
      <main className="flex-1">
        <LandingHero />
        <LandingFeatures />
      </main>
      <LandingFooter />
    </div>
  );
}
