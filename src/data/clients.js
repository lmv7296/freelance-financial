// Centralized client dataset shared between Clients dossier page and Invoices creation
export const INITIAL_CLIENTS = [
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

export const CLIENTS_STORAGE_KEY = "freelance_financial_clients";

export function getStoredClients() {
  if (typeof window === "undefined") {
    return INITIAL_CLIENTS;
  }
  try {
    const raw = localStorage.getItem(CLIENTS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (_e) {
    // Ignore JSON parse or storage errors
  }
  return INITIAL_CLIENTS;
}

export function saveStoredClients(clients) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CLIENTS_STORAGE_KEY, JSON.stringify(clients));
    window.dispatchEvent(
      new CustomEvent("clients-updated", { detail: clients }),
    );
  } catch (_e) {
    // Ignore storage quota or access errors
  }
}

/**
 * Transforms raw form data from the Add Customer wizard into a complete, normalized client record.
 * Can be reused across the application (e.g. from modals, seed scripts, or invoices).
 *
 * @param {Record<string, any>} formData
 * @returns {object} Full client record
 */
export function createClientRecord(formData) {
  const isBedrijf = formData.type === "bedrijf";
  const kvkNumber = isBedrijf
    ? formData.kvk?.trim() ||
      (formData.subLabel && /\d/.test(formData.subLabel)
        ? formData.subLabel.replace(/[^\d]/g, "")
        : null)
    : null;

  return {
    id: `CLI-${Math.floor(100 + Math.random() * 900)}`,
    type: formData.type || "particulier",
    name: formData.name?.trim() || "",
    categoryLabel: isBedrijf ? "Zakelijk / MKB" : "Particulier",
    subLabel: isBedrijf
      ? kvkNumber
        ? `KvK ${kvkNumber}`
        : "Zakelijk account"
      : formData.subLabel?.trim() || "Eigenaar-bewoner",
    kvk: kvkNumber || null,
    contactPerson: isBedrijf ? formData.contactPerson?.trim() || null : null,
    contactRole: isBedrijf ? "Contactpersoon" : null,
    btw: isBedrijf ? formData.btw?.trim() || null : null,
    phone: formData.phone?.trim() || "",
    email: formData.email?.trim() || "",
    hasLandline: false,
    locationType: isBedrijf ? "BEDRIJFSPAND" : "WERKLOCATIE",
    addressLine1: formData.addressLine1?.trim() || "Op locatie",
    addressLine2: formData.addressLine2?.trim() || "Nederland",
    siteNoteType: isBedrijf ? "Bedrijfspand" : "Werkadres",
    siteNoteIcon: isBedrijf ? "elektra" : "cv",
    siteNoteText: isBedrijf
      ? "Zakelijk bedrijfspand geregistreerd in klantdossier."
      : "Werklocatie geregistreerd in klantdossier.",
    dossierStatus: "Dossier geopend",
    lastJob: "Vandaag aangemaakt",
    totalSpent: "€0.00",
    invoicesCount: 0,
    unpaidAmount: null,
    invoices: [],
  };
}

/**
 * Filters a list of clients by active filter tab and text search query.
 *
 * @param {Array<object>} clients
 * @param {string} activeTab
 * @param {string} searchQuery
 * @returns {Array<object>} Filtered list of clients
 */
export function filterClients(clients, activeTab, searchQuery = "") {
  if (!Array.isArray(clients)) return [];
  const query = searchQuery.trim().toLowerCase();

  return clients.filter((client) => {
    if (query) {
      const matchesSearch =
        client.name?.toLowerCase().includes(query) ||
        client.addressLine1?.toLowerCase().includes(query) ||
        client.addressLine2?.toLowerCase().includes(query) ||
        client.phone?.toLowerCase().includes(query) ||
        client.contactPerson?.toLowerCase().includes(query) ||
        client.kvk?.toLowerCase().includes(query);

      if (!matchesSearch) return false;
    }

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
}

/**
 * Calculates client category counts for tab badges.
 *
 * @param {Array<object>} clients
 * @returns {{ total: number, particulierCount: number, bedrijfCount: number, unpaidCount: number }}
 */
export function getClientCounts(clients) {
  if (!Array.isArray(clients)) {
    return { total: 0, particulierCount: 0, bedrijfCount: 0, unpaidCount: 0 };
  }

  return {
    total: clients.length,
    particulierCount: clients.filter((c) => c.type === "particulier").length,
    bedrijfCount: clients.filter((c) => c.type === "bedrijf").length,
    unpaidCount: clients.filter((c) => Boolean(c.unpaidAmount)).length,
  };
}
