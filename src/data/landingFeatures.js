import {
  Clock,
  FileText,
  PiggyBank,
  QrCode,
  ShieldCheck,
  Smartphone,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";

export const APP_FEATURES = [
  {
    icon: FileText,
    badge: "Snel & Professioneel",
    title: "Factureren in 60 seconden",
    description:
      "Stel direct na afloop van de klus je factuur op. Splits arbeidsuren en verbruikte materialen met automatische BTW-berekening.",
    highlight: "WhatsApp & E-mail export",
  },
  {
    icon: PiggyBank,
    badge: "Geen verrassingen",
    title: "Automatische BTW-Kluis",
    description:
      "Bij iedere inkomende betaling wordt de 21% BTW direct apart berekend en gereserveerd voor je kwartaalaangifte bij de Belastingdienst.",
    highlight: "Altijd exact gedekt voor Q1-Q4",
  },
  {
    icon: QrCode,
    badge: "Sneller betaald",
    title: "iDEAL & QR Betaalverzoek",
    description:
      "Laat je klant ter plekke de QR-code scannen op je telefoon of stuur een directe betaallink. Gemiddeld binnen 4 uur voldaan.",
    highlight: "3x sneller betaald dan via overboeking",
  },
  {
    icon: Users,
    badge: "Centraal overzicht",
    title: "Klanten & Klushistorie",
    description:
      "Nooit meer zoeken naar oude offertes of adressen. Complete klantendossiers met KvK-vermelding, klushistorie en betaalstatus.",
    highlight: "Snelle autocomplete bij nieuwe facturen",
  },
  {
    icon: TrendingUp,
    badge: "Real-time inzicht",
    title: "Cashflow & Openstaande Posten",
    description:
      "Zie in één oogopslag welke facturen betaald zijn, wie een herinnering nodig heeft en wat je nettowinst van deze maand is.",
    highlight: "Slimme automatische betaalstatussen",
  },
  {
    icon: ShieldCheck,
    badge: "Veilig & Betrouwbaar",
    title: "Beveiligd Vakmanschap",
    description:
      "Jouw financiële data is beveiligd met moderne sessie-encryptie, HttpOnly cookies en automatische cloud-backups.",
    highlight: "Volledig AVG / GDPR compliant",
  },
];

export const WORKFLOW_STEPS = [
  {
    step: "01",
    title: "Klus gereed",
    description:
      "Pak je smartphone erbij in de bus of werkplaats. Selecteer je klant en voeg arbeidsuren en materialen toe.",
    icon: Smartphone,
  },
  {
    step: "02",
    title: "Verstuur betaallink",
    description:
      "De klant ontvangt direct een professionele factuur met iDEAL QR-code via WhatsApp of e-mail.",
    icon: Zap,
  },
  {
    step: "03",
    title: "BTW veiliggesteld",
    description:
      "Het geld staat op je rekening en de BTW zit direct vergrendeld in je virtuele kluis voor de fiscus.",
    icon: Clock,
  },
];

export const TESTIMONIAL = {
  quote:
    "Vroeger stelde ik facturen altijd uit tot zondagavond en schrok ik elk kwartaal van de BTW-aangifte. Met FreelanceFin stuur ik de factuur direct vanuit mijn bus voordat ik wegrijd. Klanten betalen vrijwel direct en mijn BTW-potje staat altijd klaar.",
  author: "Dennis van Dam",
  role: "Zelfstandig Elektricien & Installateur (Dennis Elektra)",
  kvk: "KvK 78291044",
};
