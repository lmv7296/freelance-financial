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
import { useEffect, useMemo, useState } from "react";
import { FormModal } from "@/components/FormModal";
import { InfoModal } from "@/components/InfoModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createClientRecord,
  filterClients,
  getClientCounts,
  getStoredClients,
  INITIAL_CLIENTS,
  saveStoredClients,
} from "@/data/clients";
import { useClipboard } from "@/lib/clipboard";

const FILTER_TABS = [
  "Alle Klanten",
  "Particulieren",
  "Bedrijven & Zakelijk",
  "Openstaand Saldo",
];

const ADD_CUSTOMER_STEPS = [
  {
    id: "basis",
    title: "Klanttype & Naam",
    description:
      "Kies tussen particulier of bedrijf en voer de basisidentiteit in.",
  },
  {
    id: "contact",
    title: "Contact & Facturatie",
    description: "Telefoonnummer, e-mailadres en optionele facturatiegegevens.",
  },
  {
    id: "locatie",
    title: "Werklocatie / Pand",
    description:
      "Straat, huisnummer en plaats voor werkopdrachten en facturen.",
  },
];

const ADD_CUSTOMER_FIELDS = [
  // STAP 1: Klanttype & Naam
  {
    name: "type",
    label: "Klantcategorie",
    type: "radio-cards",
    required: true,
    colSpan: 2,
    step: 0,
    defaultValue: "particulier",
    options: [
      {
        value: "particulier",
        label: "Particulier",
        description: "Consument, woningeigenaar of huurder.",
      },
      {
        value: "bedrijf",
        label: "Bedrijf / Zakelijk",
        description: "MKB onderneming, winkelier, handel of VvE.",
      },
    ],
  },
  {
    name: "name",
    label: (values) =>
      values.type === "bedrijf" ? "Bedrijfsnaam" : "Naam Klant",
    placeholder: (values) =>
      values.type === "bedrijf"
        ? "bijv. Bakkerij Van Dam of De Kaasboer B.V."
        : "bijv. Jan & Sophie de Vries",
    required: true,
    colSpan: (values) => (values.type === "bedrijf" ? 2 : 1),
    step: 0,
  },
  {
    name: "subLabel",
    label: "Woningtype / Situatie (optioneel)",
    placeholder: "bijv. Eigenaar-bewoner of Huurder",
    showIf: (values) => values.type === "particulier",
    colSpan: 1,
    step: 0,
  },
  {
    name: "kvk",
    label: "KvK-nummer",
    placeholder: "bijv. 54109823",
    showIf: (values) => values.type === "bedrijf",
    colSpan: 1,
    step: 0,
  },
  {
    name: "contactPerson",
    label: "Contactpersoon & Functie",
    placeholder: "bijv. Dennis van Dam (Eigenaar)",
    showIf: (values) => values.type === "bedrijf",
    colSpan: 1,
    step: 0,
  },

  // STAP 2: Contact & Facturatie
  {
    name: "phone",
    label: "Telefoonnummer / WhatsApp",
    type: "tel",
    placeholder: "+31 6 1234 5678",
    required: true,
    colSpan: 1,
    step: 1,
  },
  {
    name: "email",
    label: "E-mailadres Facturatie",
    type: "email",
    placeholder: (values) =>
      values.type === "bedrijf"
        ? "facturen@bakkerijvandam.nl"
        : "jan.devries@gmail.com",
    colSpan: 1,
    step: 1,
  },
  {
    name: "btw",
    label: "BTW-nummer (optioneel)",
    placeholder: "bijv. NL84920194B01",
    showIf: (values) => values.type === "bedrijf",
    colSpan: 2,
    step: 1,
  },

  // STAP 3: Werklocatie / Pand
  {
    name: "addressLine1",
    label: (values) =>
      values.type === "bedrijf"
        ? "Adres Bedrijfspand (Straat en Huisnummer)"
        : "Werklocatie (Straat en Huisnummer)",
    placeholder: "bijv. Prinsengracht 242-II of Singel 380-Huis",
    required: true,
    colSpan: 1,
    step: 2,
  },
  {
    name: "addressLine2",
    label: "Postcode en Plaats",
    placeholder: "bijv. 1016 HE Amsterdam",
    required: true,
    colSpan: 1,
    step: 2,
  },
];

// ==========================================
// 2. LOGICAL FUNCTIONS & CUSTOM HOOK
// ==========================================

/**
 * Encapsulates all state, storage synchronization, filtering, and mutation logic.
 */
function useClientsLogic() {
  const [clients, setClients] = useState(INITIAL_CLIENTS);
  const [activeTab, setActiveTab] = useState("Alle Klanten");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedClientForInfo, setSelectedClientForInfo] = useState(null);

  // Reusable clipboard hooks for address & KvK copying
  const addressClipboard = useClipboard(1800);
  const kvkClipboard = useClipboard(1800);

  // Sync clients with shared storage & cross-tab events
  useEffect(() => {
    setClients(getStoredClients());
    const handleUpdate = () => {
      setClients(getStoredClients());
    };
    window.addEventListener("clients-updated", handleUpdate);
    return () => window.removeEventListener("clients-updated", handleUpdate);
  }, []);

  // Filtered clients list based on tab and query
  const filteredClients = useMemo(() => {
    return filterClients(clients, activeTab, searchQuery);
  }, [clients, activeTab, searchQuery]);

  // Client counts per category
  const counts = useMemo(() => {
    return getClientCounts(clients);
  }, [clients]);

  // Client creation handler using reusable domain record builder
  const handleCreateClient = (formData) => {
    const newClient = createClientRecord(formData);
    setClients((prev) => {
      const updated = [newClient, ...prev];
      saveStoredClients(updated);
      return updated;
    });
    setIsAddModalOpen(false);
  };

  return {
    clients,
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    filteredClients,
    counts,
    isAddModalOpen,
    setIsAddModalOpen,
    selectedClientForInfo,
    setSelectedClientForInfo,
    addressClipboard,
    kvkClipboard,
    handleCreateClient,
  };
}

// ==========================================
// 3. UI PRESENTATIONAL COMPONENTS
// ==========================================

/**
 * Top page header with title, description, and primary CTA button.
 */
function ClientHeader({ onOpenAddModal }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-mono font-bold tracking-wider uppercase border border-indigo-500/25 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300">
            <Store className="size-3" />
            Klanten & Werklocaties
          </span>
          <span className="text-xs text-muted-foreground font-mono">
            Vakmanschap Dossiers
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground mt-1">
          Klanten & Werkadressen
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
          Werklocaties voor particulieren en bedrijfspanden voor zakelijke
          opdrachtgevers. Direct navigeren en bellen.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Button
          onClick={onOpenAddModal}
          className="rounded-full px-5 shadow-sm hover:shadow-md active:scale-[0.97] transition-all font-semibold text-xs h-9 cursor-pointer"
        >
          <Plus className="size-4 mr-1.5" />
          Nieuwe Klant Toevoegen
        </Button>
      </div>
    </div>
  );
}

/**
 * Filter tab navigation bar and quick search input.
 */
function ClientFilterBar({
  activeTab,
  onSelectTab,
  searchQuery,
  onSearchChange,
  counts,
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      {/* Category Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
        {FILTER_TABS.map((tab) => {
          const isActive = activeTab === tab;
          let count = counts.total;
          if (tab === "Particulieren") count = counts.particulierCount;
          if (tab === "Bedrijven & Zakelijk") count = counts.bedrijfCount;
          if (tab === "Openstaand Saldo") count = counts.unpaidCount;

          return (
            <button
              key={tab}
              type="button"
              onClick={() => onSelectTab(tab)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all duration-150 active:scale-[0.96] cursor-pointer ${
                isActive
                  ? "bg-foreground text-background shadow-xs"
                  : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/50"
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
        <Search className="size-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Zoek op naam, adres, telefoon..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9.5 h-9 text-xs rounded-full border-border/70 dark:border-white/[0.08]"
        />
      </div>
    </div>
  );
}

/**
 * Individual Client Card: Renders contact info, address, tech note, and dossier actions.
 */
function ClientCard({
  client,
  isCopiedAddress,
  isCopiedKvk,
  onCopyAddress,
  onCopyKvk,
  onViewDossier,
}) {
  const isParticulier = client.type === "particulier";

  return (
    <div
      className={`group rounded-3xl bg-card/90 backdrop-blur-md text-card-foreground p-5 sm:p-6 shadow-xs hover:-translate-y-1 hover:shadow-lg transition-all duration-200 flex flex-col justify-between h-full active:scale-[0.99] ${
        isParticulier
          ? "border border-indigo-500/30 dark:border-indigo-500/40"
          : "border border-border/70 dark:border-white/[0.08]"
      }`}
    >
      <div className="space-y-4 flex-1 flex flex-col">
        {/* 1. Header Row: Name + Category Tags + Active Indicator */}
        <div className="flex items-start justify-between gap-2.5 min-h-[52px]">
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground truncate">
              {client.name}
            </h2>

            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              {isParticulier ? (
                <>
                  <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/25">
                    {client.categoryLabel}
                  </span>
                  <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium bg-muted text-muted-foreground border border-border/40">
                    {client.subLabel}
                  </span>
                </>
              ) : (
                <>
                  <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/25">
                    {client.categoryLabel}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      onCopyKvk(client.kvk || "84920194", client.id)
                    }
                    className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-mono font-medium bg-muted text-muted-foreground hover:bg-muted/80 transition-all active:scale-95 cursor-pointer border border-border/40"
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

          <span
            className="size-2.5 rounded-full bg-emerald-500 shrink-0 mt-1 shadow-xs ring-4 ring-card"
            title="Actief dossier"
          />
        </div>

        {/* 2. Contact Information Box */}
        <div className="rounded-2xl bg-muted/40 border border-border/60 dark:border-white/[0.06] p-3.5 space-y-2 flex flex-col justify-center min-h-[92px]">
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

          {/* Phone & Direct Action Buttons */}
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
                    className="inline-flex items-center justify-center rounded-full bg-background border border-border/80 px-2.5 py-0.5 text-[11px] font-semibold text-foreground hover:bg-muted shadow-2xs active:scale-95 transition-all"
                  >
                    Bel
                  </a>
                  <a
                    href={`https://wa.me/${client.phone.replace(/[^0-9]/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 text-[11px] font-bold hover:bg-emerald-500/25 active:scale-95 transition-all"
                  >
                    <MessageCircle className="size-3" />
                    App
                  </a>
                </>
              ) : (
                <>
                  <a
                    href={`tel:${client.phone}`}
                    className="inline-flex items-center justify-center rounded-full bg-background border border-border/80 px-2.5 py-0.5 text-[11px] font-semibold text-foreground hover:bg-muted shadow-2xs active:scale-95 transition-all"
                  >
                    Vast
                  </a>
                  <a
                    href={`tel:${client.mobilePhone || client.phone}`}
                    className="inline-flex items-center justify-center rounded-full bg-background border border-border/80 px-2.5 py-0.5 text-[11px] font-semibold text-foreground hover:bg-muted shadow-2xs active:scale-95 transition-all"
                  >
                    Mobiel
                  </a>
                  <a
                    href={`https://wa.me/${client.phone.replace(/[^0-9]/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 text-[11px] font-bold hover:bg-emerald-500/25 active:scale-95 transition-all"
                  >
                    <MessageCircle className="size-3" />
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

        {/* 3. Location / Address Box */}
        <div className="space-y-0.5 pt-0.5 min-h-[58px]">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            <div className="flex items-center gap-1">
              {isParticulier ? (
                <MapPin className="size-3 text-primary" />
              ) : (
                <Store className="size-3 text-primary" />
              )}
              <span>{client.locationType}</span>
            </div>

            <div className="flex items-center gap-2 font-semibold lowercase tracking-normal">
              {isParticulier && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      onCopyAddress(
                        `${client.addressLine1}, ${client.addressLine2}`,
                        client.id,
                      )
                    }
                    className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  >
                    <Copy className="size-2.5" />
                    <span>{isCopiedAddress ? "Gekopieerd!" : "Kopieer"}</span>
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
                className="flex items-center gap-1 text-primary hover:underline transition-colors font-medium"
              >
                <MapIcon className="size-3" />
                <span>Navigeer</span>
              </a>
            </div>
          </div>

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
        <div className="rounded-2xl bg-muted/30 border border-border/50 dark:border-white/[0.04] p-3 flex items-start gap-2.5 text-[11px] min-h-[52px] mt-auto">
          <div className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-background border border-border/60 text-muted-foreground">
            {client.siteNoteIcon === "cv" ? (
              <Gauge className="size-3.5" />
            ) : (
              <Zap className="size-3.5" />
            )}
          </div>
          <p className="leading-snug text-foreground/90 line-clamp-2">
            <strong className="font-semibold text-foreground">
              {client.siteNoteType}:
            </strong>{" "}
            {client.siteNoteText}
          </p>
        </div>
      </div>

      {/* 5. Footer: Dossier Status & Action */}
      <div className="pt-3.5 mt-3 border-t border-border/40 flex items-center justify-between gap-2 shrink-0">
        <div className="min-w-0">
          {isParticulier ? (
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 truncate">
              <CheckCircle2 className="size-3.5 shrink-0 text-emerald-600" />
              <span className="truncate">{client.dossierStatus}</span>
            </div>
          ) : (
            <p className="text-[11px] text-muted-foreground truncate font-mono">
              {client.dossierStatus}
            </p>
          )}
        </div>

        <Button
          onClick={() => onViewDossier(client)}
          className="rounded-full px-4 h-8 text-xs font-semibold shrink-0 cursor-pointer active:scale-95 transition-all shadow-xs"
        >
          Bekijk Dossier
        </Button>
      </div>
    </div>
  );
}

/**
 * Dossier Modal: Renders client summary details and invoice history.
 */
function ClientDossierModal({ client, onClose }) {
  if (!client) return null;

  return (
    <InfoModal
      isOpen={Boolean(client)}
      onClose={onClose}
      title={client.name}
      description={`Klantdossier • ${client.categoryLabel}`}
      badge={client.subLabel}
      icon={
        client.type === "particulier" ? (
          <MapPin className="size-5" />
        ) : (
          <Store className="size-5" />
        )
      }
      maxWidth="lg"
      items={[
        {
          label: "Klant ID",
          value: client.id,
          copyable: true,
        },
        {
          label: "Klanttype",
          value: client.categoryLabel,
        },
        {
          label: "Adres (Werklocatie / Pand)",
          value: `${client.addressLine1}, ${client.addressLine2}`,
          copyable: true,
          colSpan: 2,
        },
        {
          label: "Telefoon / WhatsApp",
          value: client.phone,
          href: `tel:${client.phone}`,
          copyable: true,
        },
        {
          label: "E-mailadres",
          value: client.email,
          href: `mailto:${client.email}`,
          copyable: true,
        },
        {
          label: "Totaal Gefactureerd",
          value: client.totalSpent,
          isMoney: true,
          highlight: "success",
        },
        {
          label: "Aantal Facturen",
          value: `${client.invoicesCount} facturen verzonden`,
        },
        {
          label: "Installatie- & Toegangsnotities",
          value: `${client.siteNoteType}: ${client.siteNoteText}`,
          colSpan: 2,
        },
      ]}
      footerActions={[
        {
          label: "Sluiten",
          variant: "outline",
          onClick: onClose,
        },
        {
          label: "Bel Klant",
          variant: "secondary",
          onClick: () => {
            window.location.href = `tel:${client.phone}`;
          },
        },
        {
          label: "Route Openen",
          variant: "default",
          onClick: () => {
            window.open(
              `https://maps.google.com/?q=${encodeURIComponent(
                `${client.addressLine1}, ${client.addressLine2}`,
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
            Facturenhistorie voor {client.name}
          </h4>
          <span className="text-[11px] font-mono text-muted-foreground">
            {client.invoices?.length || 0} facturen
          </span>
        </div>

        {client.invoices && client.invoices.length > 0 ? (
          <div className="divide-y divide-border/40 rounded-xl border border-border/60 bg-muted/20 overflow-hidden text-xs">
            {client.invoices.map((inv) => (
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
  );
}

// ==========================================
// 4. MAIN PAGE COMPONENT (Orchestration Layer)
// ==========================================

export default function ClientsPage() {
  const {
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    filteredClients,
    counts,
    isAddModalOpen,
    setIsAddModalOpen,
    selectedClientForInfo,
    setSelectedClientForInfo,
    addressClipboard,
    kvkClipboard,
    handleCreateClient,
  } = useClientsLogic();

  return (
    <div className="min-h-screen bg-background p-6 md:p-8 space-y-6 font-sans">
      {/* 1. Header */}
      <ClientHeader onOpenAddModal={() => setIsAddModalOpen(true)} />

      {/* 2. Tabs & Search Bar */}
      <ClientFilterBar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        counts={counts}
      />

      {/* 3. Cards Grid: Responsive 3 Columns on Large Screens */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4.5 items-stretch">
        {filteredClients.map((client) => (
          <ClientCard
            key={client.id}
            client={client}
            isCopiedAddress={addressClipboard.copiedId === client.id}
            isCopiedKvk={kvkClipboard.copiedId === client.id}
            onCopyAddress={addressClipboard.handleCopy}
            onCopyKvk={kvkClipboard.handleCopy}
            onViewDossier={setSelectedClientForInfo}
          />
        ))}
      </div>

      {/* 4. Multi-Step Add Customer Modal */}
      <FormModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleCreateClient}
        title="Nieuwe Klant Aanmaken"
        description="Maak in 3 overzichtelijke stappen een klantprofiel aan voor een particulier of zakelijke klant."
        icon={<UserPlus className="size-5" />}
        steps={ADD_CUSTOMER_STEPS}
        fields={ADD_CUSTOMER_FIELDS}
        submitLabel="Klant Opslaan"
        maxWidth="lg"
        footerNote="Werklocaties, contactgegevens en facturatie worden direct gesynchroniseerd in het overzicht."
      />

      {/* 5. Client Dossier View Modal */}
      <ClientDossierModal
        client={selectedClientForInfo}
        onClose={() => setSelectedClientForInfo(null)}
      />
    </div>
  );
}
