"use client";

import {
  CheckCircle2,
  Clock,
  Copy,
  FileText,
  Gauge,
  Mail,
  Map as MapIcon,
  MapPin,
  MessageCircle,
  Phone,
  Plus,
  Search,
  Store,
  UserPlus,
  Zap,
} from "lucide-react";
import { useMemo, useState } from "react";
import { FormModal } from "@/components/FormModal";
import { InfoModal } from "@/components/InfoModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Comprehensive customer roster matching the exact visual card layout for Particulieren and Bedrijven
const INITIAL_CLIENTS = [
  {
    id: "CLI-101",
    type: "particulier",
    name: "Jan & Sophie de Vries",
    categoryLabel: "Particulier",
    subLabel: "Eigenaar-bewoner",
    phone: "+31 6 2849 1029",
    email: "jan.devries@gmail.com",
    hasLandline: false,
    locationType: "WERKLOCATIE",
    addressLine1: "Prinsengracht 242-II",
    addressLine2: "1016 HE Amsterdam (Centrum)",
    siteNoteType: "CV",
    siteNoteIcon: "cv",
    siteNoteText:
      "Nefit ProLine NxT HRC 24 (2021) • Hoofdkraan in gangkast onder de trap.",
    dossierStatus: "Dossier geopend",
    lastJob: "3 dagen geleden",
    totalSpent: "€1,850.00",
    invoicesCount: 4,
    unpaidAmount: null,
    invoices: [
      {
        id: "INV-2044",
        date: "Oct 12, 2026",
        amount: "€480.00",
        status: "Paid",
      },
      {
        id: "INV-1998",
        date: "Jul 14, 2026",
        amount: "€620.00",
        status: "Paid",
      },
      {
        id: "INV-1945",
        date: "Mar 02, 2026",
        amount: "€350.00",
        status: "Paid",
      },
      {
        id: "INV-1892",
        date: "Nov 18, 2025",
        amount: "€400.00",
        status: "Paid",
      },
    ],
  },
  {
    id: "CLI-102",
    type: "bedrijf",
    name: "Bakkerij Van Dam",
    categoryLabel: "Zakelijk / MKB",
    subLabel: "KvK 84920194",
    kvk: "84920194",
    contactPerson: "Dennis van Dam",
    contactRole: "Eigenaar",
    btw: "NL84920194B01",
    phone: "+31 20 624 8190",
    mobilePhone: "+31 6 4920 1180",
    email: "administratie@bakkerijvandam.nl",
    hasLandline: true,
    locationType: "BEDRIJFSPAND",
    addressLine1: "Singel 380-Huis",
    addressLine2: "1016 AK Amsterdam",
    siteNoteType: "Elektra",
    siteNoteIcon: "elektra",
    siteNoteText:
      "3-fase krachtstroom 400V bakkerijovens. Toegang installatie via achterom in de steeg.",
    dossierStatus: "Laatste klus: 3 wkn geleden",
    lastJob: "3 wkn geleden",
    totalSpent: "€6,420.00",
    invoicesCount: 12,
    unpaidAmount: "€640.00 (Due Oct 24)",
    invoices: [
      {
        id: "INV-2045",
        date: "Oct 10, 2026",
        amount: "€1,240.00",
        status: "Pending",
      },
      {
        id: "INV-2020",
        date: "Sep 22, 2026",
        amount: "€820.00",
        status: "Paid",
      },
      {
        id: "INV-1994",
        date: "Aug 15, 2026",
        amount: "€1,100.00",
        status: "Paid",
      },
    ],
  },
  {
    id: "CLI-103",
    type: "particulier",
    name: "Arthur & Claire Pendleton",
    categoryLabel: "Particulier",
    subLabel: "Eigenaar-bewoner",
    phone: "+31 6 4410 7720",
    email: "arthur.pendleton@gmail.com",
    hasLandline: false,
    locationType: "WERKLOCATIE",
    addressLine1: "Julianalaan 88",
    addressLine2: "2012 Haarlem (Zuid)",
    siteNoteType: "CV",
    siteNoteIcon: "cv",
    siteNoteText:
      "Remeha Calenta Ace 40C (2022) • Gasafsluiter in kelderkast links van de trap.",
    dossierStatus: "Dossier geopend",
    lastJob: "1 week geleden",
    totalSpent: "€2,120.00",
    invoicesCount: 5,
    unpaidAmount: null,
    invoices: [
      {
        id: "INV-2041",
        date: "Sep 25, 2026",
        amount: "€480.00",
        status: "Paid",
      },
      {
        id: "INV-1988",
        date: "Jun 14, 2026",
        amount: "€520.00",
        status: "Paid",
      },
    ],
  },
  {
    id: "CLI-104",
    type: "bedrijf",
    name: "De Kaasboer (Centrale Markt)",
    categoryLabel: "Zakelijk / MKB",
    subLabel: "KvK 54109823",
    kvk: "54109823",
    contactPerson: "Peter Kaasboer",
    contactRole: "Marktkoopman",
    btw: "NL810293847B01",
    phone: "+31 6 8812 9044",
    email: "orders@dekaasboer-market.nl",
    hasLandline: false,
    locationType: "BEDRIJFSPAND",
    addressLine1: "Vredenburg Markt (Pitch 14)",
    addressLine2: "3511 Utrecht",
    siteNoteType: "Elektra",
    siteNoteIcon: "elektra",
    siteNoteText:
      "230V marktkraam haspel & koelvitrine aansluiting. Zaterdag om 06:00 stroom aan.",
    dossierStatus: "Laatste klus: 5 dgn geleden",
    lastJob: "5 dgn geleden",
    totalSpent: "€5,890.00",
    invoicesCount: 16,
    unpaidAmount: null,
    invoices: [
      {
        id: "INV-2042",
        date: "Oct 04, 2026",
        amount: "€890.00",
        status: "Paid",
      },
      {
        id: "INV-2018",
        date: "Sep 20, 2026",
        amount: "€750.00",
        status: "Paid",
      },
    ],
  },
  {
    id: "CLI-105",
    type: "bedrijf",
    name: "Koraal Vastgoedbeheer",
    categoryLabel: "Zakelijk / MKB",
    subLabel: "KvK 34189021",
    kvk: "34189021",
    contactPerson: "Pieter Koraal",
    contactRole: "Vastgoedbeheerder",
    btw: "NL819203948B01",
    phone: "+31 20 890 1200",
    email: "onderhoud@koraal-vastgoed.nl",
    hasLandline: true,
    locationType: "BEDRIJFSPAND",
    addressLine1: "Keizersgracht 118",
    addressLine2: "1015 CJ Amsterdam",
    siteNoteType: "Elektra",
    siteNoteIcon: "elektra",
    siteNoteText:
      "Hoofdverdeelkast in centrale kelder. Sleutelcode loper: 4410#. NEN 3140 gekeurd.",
    dossierStatus: "Laatste klus: 2 wkn geleden",
    lastJob: "2 wkn geleden",
    totalSpent: "€9,450.00",
    invoicesCount: 9,
    unpaidAmount: "€1,250.00 (Due Oct 25)",
    invoices: [
      {
        id: "INV-2046",
        date: "Oct 12, 2026",
        amount: "€2,850.00",
        status: "Pending",
      },
      {
        id: "INV-2010",
        date: "Aug 15, 2026",
        amount: "€1,950.00",
        status: "Paid",
      },
    ],
  },
  {
    id: "CLI-106",
    type: "particulier",
    name: "Elena Rostova",
    categoryLabel: "Particulier",
    subLabel: "Huurder",
    phone: "+31 6 9033 4455",
    email: "elena.rostova@icloud.com",
    hasLandline: false,
    locationType: "WERKLOCATIE",
    addressLine1: "Keizersgracht 340-III",
    addressLine2: "1016 EZ Amsterdam",
    siteNoteType: "Elektra",
    siteNoteIcon: "elektra",
    siteNoteText:
      "Slimme meter 1-fase in hal • Aardlekautomaat B16 groep 4 keuken vernieuwd.",
    dossierStatus: "Dossier geopend",
    lastJob: "1 mnd geleden",
    totalSpent: "€790.00",
    invoicesCount: 3,
    unpaidAmount: null,
    invoices: [
      {
        id: "INV-2040",
        date: "Sep 20, 2026",
        amount: "€540.00",
        status: "Paid",
      },
    ],
  },
];

const FILTER_TABS = [
  "Alle Klanten",
  "Particulieren",
  "Bedrijven & Zakelijk",
  "Openstaand Saldo",
];

// Clean Schema: Props-driven FormModal for Adding Customer
const ADD_CUSTOMER_FIELDS = [
  {
    name: "type",
    label: "Type Klant",
    type: "select",
    required: true,
    colSpan: 1,
    options: [
      { label: "Particulier (Consument)", value: "particulier" },
      { label: "Zakelijk / Bedrijf (MKB / Handel)", value: "bedrijf" },
    ],
    defaultValue: "particulier",
  },
  {
    name: "name",
    label: "Naam Klant / Bedrijfsnaam",
    placeholder: "bijv. Jan & Sophie de Vries of Bakkerij Van Dam",
    required: true,
    colSpan: 1,
  },
  {
    name: "subLabel",
    label: "Label / Eigenschap",
    placeholder: "bijv. Eigenaar-bewoner, Huurder of KvK nummer",
    colSpan: 1,
  },
  {
    name: "contactPerson",
    label: "Contactpersoon & Rol (voor Bedrijven)",
    placeholder: "bijv. Dennis van Dam (Eigenaar)",
    colSpan: 1,
  },
  {
    name: "btw",
    label: "BTW Nummer (optioneel)",
    placeholder: "bijv. NL84920194B01",
    colSpan: 1,
  },
  {
    name: "phone",
    label: "Telefoonnummer / WhatsApp",
    type: "tel",
    placeholder: "+31 6 1234 5678",
    required: true,
    colSpan: 1,
  },
  {
    name: "email",
    label: "E-mailadres Facturatie",
    type: "email",
    placeholder: "facturen@voorbeeld.nl",
    colSpan: 2,
  },
  {
    name: "addressLine1",
    label: "Straat en Huisnummer (Werklocatie / Pand)",
    placeholder: "bijv. Prinsengracht 242-II of Singel 380-Huis",
    required: true,
    colSpan: 1,
  },
  {
    name: "addressLine2",
    label: "Postcode en Plaats",
    placeholder: "bijv. 1016 HE Amsterdam",
    required: true,
    colSpan: 1,
  },
  {
    name: "siteNoteText",
    label: "Installatie- & Toegangsnotities (CV, Elektra, Meterkast)",
    type: "textarea",
    placeholder:
      "bijv. CV: Nefit ProLine (2021) • Hoofdkraan in gangkast onder de trap • Sleutel in sleutelkluis.",
    rows: 3,
    colSpan: 2,
  },
];

export default function ClientsPage() {
  const [clients, setClients] = useState(INITIAL_CLIENTS);
  const [activeTab, setActiveTab] = useState("Alle Klanten");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedClientForInfo, setSelectedClientForInfo] = useState(null);
  const [copiedAddressId, setCopiedAddressId] = useState(null);
  const [copiedKvkId, setCopiedKvkId] = useState(null);

  const filteredClients = useMemo(() => {
    return clients.filter((client) => {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        client.name.toLowerCase().includes(query) ||
        client.addressLine1.toLowerCase().includes(query) ||
        client.addressLine2.toLowerCase().includes(query) ||
        client.phone.toLowerCase().includes(query) ||
        client.contactPerson?.toLowerCase().includes(query);

      if (!matchesSearch) return false;

      if (activeTab === "Particulieren") {
        return client.type === "particulier";
      }
      if (activeTab === "Bedrijven & Zakelijk") {
        return client.type === "bedrijf";
      }
      if (activeTab === "Openstaand Saldo") {
        return Boolean(client.unpaidAmount);
      }

      return true;
    });
  }, [clients, activeTab, searchQuery]);

  const particulierCount = clients.filter(
    (c) => c.type === "particulier",
  ).length;
  const bedrijfCount = clients.filter((c) => c.type === "bedrijf").length;
  const unpaidCount = clients.filter((c) => Boolean(c.unpaidAmount)).length;

  const handleCopy = (text, id, type = "address") => {
    navigator.clipboard?.writeText(text);
    if (type === "address") {
      setCopiedAddressId(id);
      setTimeout(() => setCopiedAddressId(null), 1800);
    } else {
      setCopiedKvkId(id);
      setTimeout(() => setCopiedKvkId(null), 1800);
    }
  };

  const handleCreateClient = (formData) => {
    const isBedrijf = formData.type === "bedrijf";
    const newClient = {
      id: `CLI-${Math.floor(100 + Math.random() * 900)}`,
      type: formData.type || "particulier",
      name: formData.name,
      categoryLabel: isBedrijf ? "Zakelijk / MKB" : "Particulier",
      subLabel:
        formData.subLabel ||
        (isBedrijf ? "Zakelijk account" : "Eigenaar-bewoner"),
      kvk: isBedrijf ? formData.subLabel?.replace(/[^\d]/g, "") : null,
      contactPerson: formData.contactPerson || null,
      contactRole: isBedrijf ? "Contactpersoon" : null,
      btw: formData.btw || null,
      phone: formData.phone || "",
      email: formData.email || "",
      hasLandline: false,
      locationType: isBedrijf ? "BEDRIJFSPAND" : "WERKLOCATIE",
      addressLine1: formData.addressLine1 || "Op locatie",
      addressLine2: formData.addressLine2 || "Nederland",
      siteNoteType: isBedrijf ? "Elektra" : "CV",
      siteNoteIcon: isBedrijf ? "elektra" : "cv",
      siteNoteText:
        formData.siteNoteText || "Locatie- en installatiegegevens op aanvraag.",
      dossierStatus: "Dossier geopend",
      lastJob: "Vandaag aangemaakt",
      totalSpent: "€0.00",
      invoicesCount: 0,
      unpaidAmount: null,
      invoices: [],
    };

    setClients((prev) => [newClient, ...prev]);
    setIsAddModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-background p-6 md:p-8 space-y-6 font-sans">
      {/* 1. Header Section */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Klanten & Dossiers
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Werklocaties voor particulieren en bedrijfspanden voor zakelijke
            opdrachtgevers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setIsAddModalOpen(true)}
            className="rounded-full px-5 shadow-sm hover:shadow-md active:scale-[0.97] transition-all font-semibold text-xs h-9 cursor-pointer"
          >
            <Plus className="size-4 mr-1.5" />
            Nieuwe Klant Toevoegen
          </Button>
        </div>
      </div>

      {/* 2. Top Tabs & Search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {FILTER_TABS.map((tab) => {
            const isActive = activeTab === tab;
            let count = clients.length;
            if (tab === "Particulieren") count = particulierCount;
            if (tab === "Bedrijven & Zakelijk") count = bedrijfCount;
            if (tab === "Openstaand Saldo") count = unpaidCount;

            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all duration-150 cursor-pointer ${
                  isActive
                    ? "bg-foreground text-background shadow-xs"
                    : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/40"
                }`}
              >
                <span>{tab}</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono ${
                    isActive
                      ? "bg-background/20 text-background"
                      : "bg-background/60 text-muted-foreground"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Zoek op naam, adres, telefoon..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-xs rounded-full"
          />
        </div>
      </div>

      {/* 3. Cards Grid: Responsive 3 Columns on Large Screens with Equal Height */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4.5 items-stretch">
        {filteredClients.map((client) => {
          const isParticulier = client.type === "particulier";
          const isCopiedAddress = copiedAddressId === client.id;
          const isCopiedKvk = copiedKvkId === client.id;

          return (
            <div
              key={client.id}
              className={`rounded-2xl bg-card text-card-foreground p-4.5 sm:p-5 shadow-sm transition-all duration-200 flex flex-col justify-between h-full ${
                isParticulier
                  ? "border-2 border-[#1E1B4B] dark:border-indigo-500/60 shadow-md"
                  : "border border-border/80 hover:border-foreground/20"
              }`}
            >
              <div className="space-y-3.5 flex-1 flex flex-col">
                {/* 1. Header Row: Name + Green Status Indicator */}
                <div className="flex items-start justify-between gap-2.5 min-h-[52px]">
                  <div className="min-w-0">
                    <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground truncate">
                      {client.name}
                    </h2>

                    {/* Category Tags */}
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      {isParticulier ? (
                        <>
                          <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold bg-[#EEF2FF] text-[#4338CA] dark:bg-indigo-950/60 dark:text-indigo-300">
                            {client.categoryLabel}
                          </span>
                          <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium bg-[#F1F5F9] text-[#475569] dark:bg-muted dark:text-muted-foreground">
                            {client.subLabel}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold bg-[#FEF3C7] text-[#92400E] dark:bg-amber-950/60 dark:text-amber-300">
                            {client.categoryLabel}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              handleCopy(
                                client.kvk || "84920194",
                                client.id,
                                "kvk",
                              )
                            }
                            className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium bg-[#F1F5F9] text-[#475569] hover:bg-muted/80 transition-colors cursor-pointer dark:bg-muted dark:text-muted-foreground"
                            title="Kopieer KvK"
                          >
                            <span>{client.subLabel}</span>
                            <Copy className="size-3 opacity-60" />
                            {isCopiedKvk && (
                              <span className="text-[10px] text-emerald-600 font-bold ml-0.5">
                                ✓
                              </span>
                            )}
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Active Green Dot */}
                  <span
                    className="size-2.5 rounded-full bg-[#059669] shrink-0 mt-1 shadow-xs"
                    title="Actief dossier"
                  />
                </div>

                {/* 2. Contact Information Box */}
                <div className="rounded-xl bg-[#F8FAFC] dark:bg-muted/30 border border-[#E2E8F0] dark:border-border/50 p-3 space-y-2 flex flex-col justify-center min-h-[92px]">
                  {/* Zakelijk Contactperson & BTW Row */}
                  {!isParticulier && client.contactPerson && (
                    <div className="flex items-center justify-between text-[11px] pb-1 border-b border-border/40 gap-1 flex-wrap">
                      <div className="truncate">
                        <span className="font-semibold text-foreground">
                          {client.contactPerson}
                        </span>{" "}
                        <span className="text-muted-foreground">
                          ({client.contactRole || "Eigenaar"})
                        </span>
                      </div>
                      {client.btw && (
                        <span className="font-mono text-muted-foreground shrink-0 text-[10px]">
                          BTW: {client.btw}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Phone Row + Quick Action Buttons */}
                  <div className="flex items-center justify-between gap-1.5 flex-wrap">
                    <div className="flex items-center gap-1.5 text-xs text-foreground min-w-0">
                      <Phone className="size-3.5 text-muted-foreground shrink-0" />
                      <span className="font-mono text-xs font-semibold tracking-tight truncate">
                        {client.phone}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {isParticulier ? (
                        <>
                          <a
                            href={`tel:${client.phone}`}
                            className="inline-flex items-center justify-center rounded-md bg-white dark:bg-card border border-border/80 px-2 py-0.5 text-[11px] font-medium text-foreground hover:bg-muted shadow-2xs transition-colors"
                          >
                            Bel
                          </a>
                          <a
                            href={`https://wa.me/${client.phone.replace(/[^0-9]/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-md bg-[#86EFAC]/40 dark:bg-emerald-950/60 text-[#14532D] dark:text-emerald-300 border border-[#22C55E]/30 px-2 py-0.5 text-[11px] font-semibold hover:bg-[#86EFAC]/60 transition-colors"
                          >
                            <MessageCircle className="size-3" />
                            App
                          </a>
                        </>
                      ) : (
                        <>
                          <a
                            href={`tel:${client.phone}`}
                            className="inline-flex items-center justify-center rounded-md bg-white dark:bg-card border border-border/80 px-1.5 py-0.5 text-[11px] font-medium text-foreground hover:bg-muted shadow-2xs transition-colors"
                          >
                            Vast
                          </a>
                          <a
                            href={`tel:${client.mobilePhone || client.phone}`}
                            className="inline-flex items-center justify-center rounded-md bg-white dark:bg-card border border-border/80 px-1.5 py-0.5 text-[11px] font-medium text-foreground hover:bg-muted shadow-2xs transition-colors"
                          >
                            Mobiel
                          </a>
                          <a
                            href={`https://wa.me/${client.phone.replace(/[^0-9]/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-md bg-[#86EFAC]/40 dark:bg-emerald-950/60 text-[#14532D] dark:text-emerald-300 border border-[#22C55E]/30 px-1.5 py-0.5 text-[11px] font-semibold hover:bg-[#86EFAC]/60 transition-colors"
                          >
                            App
                          </a>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Email Row */}
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground pt-0.5">
                    <Mail className="size-3.5 shrink-0" />
                    <a
                      href={`mailto:${client.email}`}
                      className="hover:text-foreground hover:underline truncate"
                    >
                      {client.email}
                    </a>
                  </div>
                </div>

                {/* 3. Werklocatie / Bedrijfspand Header + Address */}
                <div className="space-y-0.5 pt-0.5 min-h-[58px]">
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    <div className="flex items-center gap-1">
                      {isParticulier ? (
                        <MapPin className="size-3" />
                      ) : (
                        <Store className="size-3" />
                      )}
                      <span>{client.locationType}</span>
                    </div>

                    <div className="flex items-center gap-1.5 font-semibold lowercase tracking-normal">
                      {isParticulier && (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              handleCopy(
                                `${client.addressLine1}, ${client.addressLine2}`,
                                client.id,
                                "address",
                              )
                            }
                            className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                          >
                            <Copy className="size-2.5" />
                            <span>
                              {isCopiedAddress ? "Gekopieerd!" : "Kopieer"}
                            </span>
                          </button>
                          <span className="text-muted-foreground/40">•</span>
                        </>
                      )}

                      <a
                        href={`https://maps.google.com/?q=${encodeURIComponent(
                          `${client.addressLine1}, ${client.addressLine2}`,
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <MapIcon className="size-2.5" />
                        <span>Route</span>
                      </a>
                    </div>
                  </div>

                  {/* Address Content */}
                  <div>
                    <h3 className="text-sm font-semibold text-foreground truncate">
                      {client.addressLine1}
                    </h3>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {client.addressLine2}
                    </p>
                  </div>
                </div>

                {/* 4. Technical / Location Details Note Box */}
                <div className="rounded-xl bg-[#F8FAFC] dark:bg-muted/30 border border-[#E2E8F0] dark:border-border/50 p-2.5 flex items-start gap-2 text-[11px] min-h-[52px] mt-auto">
                  {client.siteNoteIcon === "cv" ? (
                    <Gauge className="size-3.5 text-muted-foreground shrink-0 mt-0.5" />
                  ) : (
                    <Zap className="size-3.5 text-muted-foreground shrink-0 mt-0.5" />
                  )}
                  <p className="leading-snug text-foreground/90 line-clamp-2">
                    <strong className="font-semibold text-foreground">
                      {client.siteNoteType}:
                    </strong>{" "}
                    {client.siteNoteText}
                  </p>
                </div>
              </div>

              {/* 5. Footer: Dossier Status + Bekijk Dossier Button */}
              <div className="pt-3.5 mt-3 border-t border-border/40 flex items-center justify-between gap-2 shrink-0">
                <div className="min-w-0">
                  {isParticulier ? (
                    <div className="flex items-center gap-1 text-[11px] font-medium text-[#1E1B4B] dark:text-indigo-300 truncate">
                      <CheckCircle2 className="size-3.5 shrink-0" />
                      <span className="truncate">{client.dossierStatus}</span>
                    </div>
                  ) : (
                    <p className="text-[11px] text-muted-foreground truncate">
                      {client.dossierStatus}
                    </p>
                  )}
                </div>

                <Button
                  onClick={() => setSelectedClientForInfo(client)}
                  className={`rounded-lg px-3 h-7.5 text-xs font-semibold shrink-0 cursor-pointer active:scale-95 transition-all shadow-xs ${
                    isParticulier
                      ? "bg-[#1E1B4B] text-white hover:bg-[#1E1B4B]/90"
                      : "bg-[#EEF2FF] text-[#312E81] hover:bg-[#E0E7FF] dark:bg-indigo-950/60 dark:text-indigo-200 dark:hover:bg-indigo-900 border border-[#C7D2FE] dark:border-indigo-800"
                  }`}
                >
                  Bekijk Dossier
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* 4. Reusable FormModal: Nieuwe Klant Toevoegen */}
      <FormModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleCreateClient}
        title="Nieuwe Klant Aanmaken"
        description="Maak een klantprofiel aan voor een particulier of zakelijke opdrachtgever."
        icon={<UserPlus className="size-5" />}
        fields={ADD_CUSTOMER_FIELDS}
        submitLabel="Klant Opslaan"
        maxWidth="lg"
        footerNote="Werklocaties, contactgegevens en installatienotities worden veilig opgeslagen in het klantdossier."
      />

      {/* 5. Reusable InfoModal: Klantdossier Bekijken */}
      {selectedClientForInfo && (
        <InfoModal
          isOpen={Boolean(selectedClientForInfo)}
          onClose={() => setSelectedClientForInfo(null)}
          title={selectedClientForInfo.name}
          description={`Klantdossier • ${selectedClientForInfo.categoryLabel}`}
          badge={selectedClientForInfo.subLabel}
          icon={
            selectedClientForInfo.type === "particulier" ? (
              <MapPin className="size-5" />
            ) : (
              <Store className="size-5" />
            )
          }
          maxWidth="lg"
          items={[
            {
              label: "Klant ID",
              value: selectedClientForInfo.id,
              copyable: true,
            },
            {
              label: "Klanttype",
              value: selectedClientForInfo.categoryLabel,
            },
            {
              label: "Adres (Werklocatie / Pand)",
              value: `${selectedClientForInfo.addressLine1}, ${selectedClientForInfo.addressLine2}`,
              copyable: true,
              colSpan: 2,
            },
            {
              label: "Telefoon / WhatsApp",
              value: selectedClientForInfo.phone,
              href: `tel:${selectedClientForInfo.phone}`,
              copyable: true,
            },
            {
              label: "E-mailadres",
              value: selectedClientForInfo.email,
              href: `mailto:${selectedClientForInfo.email}`,
              copyable: true,
            },
            {
              label: "Totaal Gefactureerd",
              value: selectedClientForInfo.totalSpent,
              isMoney: true,
              highlight: "success",
            },
            {
              label: "Aantal Facturen",
              value: `${selectedClientForInfo.invoicesCount} facturen verzonden`,
            },
            {
              label: "Installatie- & Toegangsnotities",
              value: `${selectedClientForInfo.siteNoteType}: ${selectedClientForInfo.siteNoteText}`,
              colSpan: 2,
            },
          ]}
          footerActions={[
            {
              label: "Sluiten",
              variant: "outline",
              onClick: () => setSelectedClientForInfo(null),
            },
            {
              label: "Bel Klant",
              variant: "secondary",
              onClick: () => {
                window.location.href = `tel:${selectedClientForInfo.phone}`;
              },
            },
            {
              label: "Route Openen",
              variant: "default",
              onClick: () => {
                window.open(
                  `https://maps.google.com/?q=${encodeURIComponent(
                    `${selectedClientForInfo.addressLine1}, ${selectedClientForInfo.addressLine2}`,
                  )}`,
                  "_blank",
                );
              },
            },
          ]}
        >
          {/* Facturen & Klussen Historie */}
          <div className="pt-3 border-t border-border/50 space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <FileText className="size-3.5 text-primary" />
                Facturenhistorie voor {selectedClientForInfo.name}
              </h4>
              <span className="text-[11px] font-mono text-muted-foreground">
                {selectedClientForInfo.invoices?.length || 0} facturen
              </span>
            </div>

            {selectedClientForInfo.invoices &&
            selectedClientForInfo.invoices.length > 0 ? (
              <div className="divide-y divide-border/40 rounded-xl border border-border/60 bg-muted/20 overflow-hidden text-xs">
                {selectedClientForInfo.invoices.map((inv) => (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between p-3 hover:bg-muted/40 transition-colors"
                  >
                    <div>
                      <p className="font-semibold font-mono text-foreground">
                        {inv.id}
                      </p>
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Clock className="size-3" />
                        Verzonden {inv.date}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <p className="font-mono font-bold text-foreground tabular-nums">
                        {inv.amount}
                      </p>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                          inv.status === "Paid"
                            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/25"
                            : "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/25"
                        }`}
                      >
                        {inv.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic py-3 text-center border rounded-xl bg-muted/20">
                Nog geen facturen verzonden naar deze klant.
              </p>
            )}
          </div>
        </InfoModal>
      )}
    </div>
  );
}
