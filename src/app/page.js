import { LandingFeatures } from "@/components/LandingFeatures";
import { LandingFooter } from "@/components/LandingFooter";
import { LandingHero } from "@/components/LandingHero";
import { LandingNavbar } from "@/components/LandingNavbar";

export const metadata = {
  title: "FreelanceFin — Eenvoudige Facturen & BTW-Kluis voor Vakmensen & ZZP",
  description:
    "Factureer in 60 seconden vanuit je bus, laat klanten direct via iDEAL betalen en reserveer automatisch je BTW voor de Belastingdienst.",
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
