import { ClientAutocomplete } from "@/components/ClientAutocomplete";
import { ClientInvoicePreview } from "@/components/ClientInvoicePreview";
import { LineItemsEditor } from "@/components/LineItemsEditor";
import {
  DEFAULT_LINE_ITEMS,
  PAYMENT_METHODS,
  TRADE_TYPES,
  VAT_RATES,
} from "@/data/invoices";
import { calculateDueDate, getTermDaysFromMethod } from "@/lib/dateUtils";

/**
 * 3-step wizard workflow definition for creating invoices / payment requests.
 */
export const CREATE_INVOICE_STEPS = [
  {
    id: "klant",
    title: "Klant & Type",
    description:
      "Kies tussen particulier of zakelijk en vul de klantgegevens in.",
  },
  {
    id: "opbouw",
    title: "Opbouw Factuur",
    description:
      "Stel vakgebied, factuurnummer, gesplitste uren/materialen en betaalmethode in.",
  },
  {
    id: "preview",
    title: "Klantvoorbeeld",
    description:
      "Bekijk de officiële factuur en de klantweergave voor de gekozen betaalwijze.",
    renderStep: (formValues) => (
      <ClientInvoicePreview formValues={formValues} />
    ),
  },
];

/**
 * Schema definition for FormModal fields.
 * Strictly separates customer information (Step 0) from invoice construction (Step 1).
 */
export const CREATE_INVOICE_FIELDS = [
  // ==========================================
  // --- STAP 1: Klant & Type (Alleen klant info & bedrijf/particulier) ---
  // ==========================================
  {
    name: "clientType",
    label: "Type Klant",
    type: "switch",
    required: true,
    colSpan: 2,
    step: 0,
    defaultValue: "particulier",
    options: [
      {
        value: "particulier",
        label: "Particulier",
      },
      {
        value: "bedrijf",
        label: "Bedrijf / Zakelijk",
      },
    ],
  },

  // --- Particulier: Klantgegevens ---
  {
    name: "clientName",
    label: "Naam Klant",
    type: "custom",
    required: true,
    showIf: (values) => values.clientType === "particulier",
    colSpan: 1,
    step: 0,
    render: (formValues, { handleChange, errors, setFormValues }) => (
      <ClientAutocomplete
        clientType="particulier"
        name="clientName"
        label="Naam Klant"
        placeholder="bijv. Jan & Sophie de Vries"
        required
        value={formValues.clientName || ""}
        onChange={(val) => handleChange("clientName", val)}
        onSelectClient={(client) => {
          setFormValues((prev) => ({
            ...prev,
            clientName: client.name || prev.clientName,
            clientEmail: client.email || prev.clientEmail || "",
            clientPhone: client.phone || prev.clientPhone || "",
            clientAddress: client.addressLine1
              ? `${client.addressLine1}${client.city ? `, ${client.city}` : ""}`
              : prev.clientAddress || "",
            tradeType:
              client.siteNoteIcon === "cv" || client.siteNoteType === "CV"
                ? "Plumber"
                : client.siteNoteIcon === "elektra"
                  ? "Electrician"
                  : prev.tradeType || "Electrician",
          }));
        }}
        error={errors.clientName}
      />
    ),
  },
  {
    name: "clientPhone",
    label: "Telefoonnummer (optioneel)",
    type: "tel",
    placeholder: "bijv. +31 6 12345678",
    showIf: (values) => values.clientType === "particulier",
    colSpan: 1,
    step: 0,
  },
  {
    name: "clientEmail",
    label: "E-mailadres Klant (voor factuurverzending)",
    type: "email",
    placeholder: "bijv. jan@devries.nl",
    showIf: (values) => values.clientType === "particulier",
    colSpan: 1,
    step: 0,
  },
  {
    name: "clientAddress",
    label: "Woonadres / Locatie van werk",
    type: "text",
    placeholder: "bijv. Keizersgracht 421, 1016 EK Amsterdam",
    showIf: (values) => values.clientType === "particulier",
    colSpan: 1,
    step: 0,
  },

  // --- Bedrijf: Bedrijfsgegevens ---
  {
    name: "companyName",
    label: "Bedrijfsnaam",
    type: "custom",
    required: true,
    showIf: (values) => values.clientType === "bedrijf",
    colSpan: 1,
    step: 0,
    render: (formValues, { handleChange, errors, setFormValues }) => (
      <ClientAutocomplete
        clientType="bedrijf"
        name="companyName"
        label="Bedrijfsnaam"
        placeholder="bijv. Bakkerij Van Dam of Koraal Vastgoed"
        required
        value={formValues.companyName || ""}
        onChange={(val) => handleChange("companyName", val)}
        onSelectClient={(client) => {
          setFormValues((prev) => ({
            ...prev,
            companyName: client.name || prev.companyName,
            contactPerson: client.contactPerson || prev.contactPerson || "",
            vatNumber: client.btw || prev.vatNumber || "",
            kvkNumber: client.kvk || prev.kvkNumber || "",
            companyEmail: client.email || prev.companyEmail || "",
            companyPhone: client.phone || prev.companyPhone || "",
            companyAddress: client.addressLine1
              ? `${client.addressLine1}${client.city ? `, ${client.city}` : ""}`
              : prev.companyAddress || "",
            tradeType:
              client.contactRole === "Marktkoopman"
                ? "Market Trader (Markt)"
                : client.siteNoteIcon === "cv"
                  ? "Plumber"
                  : client.siteNoteIcon === "elektra"
                    ? "Electrician"
                    : prev.tradeType || "Commercial",
          }));
        }}
        error={errors.companyName}
      />
    ),
  },
  {
    name: "contactPerson",
    label: "Contactpersoon & Functie",
    placeholder: "bijv. Pieter Koraal (Vastgoedbeheerder)",
    showIf: (values) => values.clientType === "bedrijf",
    colSpan: 1,
    step: 0,
  },
  {
    name: "vatNumber",
    label: "BTW-identificatienummer Klant (optioneel)",
    placeholder: "bijv. NL819203948B01",
    showIf: (values) => values.clientType === "bedrijf",
    colSpan: 1,
    step: 0,
  },
  {
    name: "kvkNumber",
    label: "KvK-nummer Klant (optioneel)",
    placeholder: "bijv. 78291044",
    showIf: (values) => values.clientType === "bedrijf",
    colSpan: 1,
    step: 0,
  },
  {
    name: "companyEmail",
    label: "Zakelijk E-mailadres Facturatie",
    type: "email",
    placeholder: "bijv. facturen@koraalvastgoed.nl",
    showIf: (values) => values.clientType === "bedrijf",
    colSpan: 1,
    step: 0,
  },
  {
    name: "companyPhone",
    label: "Zakelijk Telefoonnummer",
    type: "tel",
    placeholder: "bijv. +31 20 891 0022",
    showIf: (values) => values.clientType === "bedrijf",
    colSpan: 1,
    step: 0,
  },
  {
    name: "companyAddress",
    label: "Vestigingsadres & Postcode",
    type: "text",
    placeholder: "bijv. Singel 240, 1016 AB Amsterdam",
    showIf: (values) => values.clientType === "bedrijf",
    colSpan: 2,
    step: 0,
  },

  // ==========================================
  // --- STAP 2: Opbouw Factuur (Vakgebied, Regels, BTW, Betaalwijze, Termijn) ---
  // ==========================================
  {
    name: "tradeType",
    label: "Vakgebied / Type Werk",
    type: "select",
    required: true,
    colSpan: 1,
    step: 1,
    defaultValue: "Electrician",
    options: TRADE_TYPES,
  },
  {
    name: "invoiceNumber",
    label: "Factuurnummer / Kenmerk",
    type: "text",
    required: true,
    colSpan: 1,
    step: 1,
    defaultValue: "INV-2047",
    placeholder: "bijv. INV-2047",
  },
  {
    name: "items",
    type: "custom",
    defaultValue: DEFAULT_LINE_ITEMS,
    colSpan: 2,
    step: 1,
    render: (formValues, { handleChange }) => (
      <LineItemsEditor formValues={formValues} handleChange={handleChange} />
    ),
  },
  {
    name: "vatRate",
    label: "BTW-tarief",
    type: "select",
    defaultValue: "21",
    colSpan: 1,
    step: 1,
    options: VAT_RATES,
  },
  {
    name: "method",
    label: "Gewenste Betaalwijze",
    type: "select",
    defaultValue: "Tikkie / iDEAL QR",
    colSpan: 1,
    step: 1,
    options: PAYMENT_METHODS,
    onChange: (newMethod, currentValues) => {
      const days = getTermDaysFromMethod(newMethod);
      return {
        ...currentValues,
        method: newMethod,
        due: calculateDueDate(days),
      };
    },
  },
  {
    name: "due",
    label: "Betaaltermijn / Vervaldatum",
    type: "date",
    defaultValue: () => calculateDueDate(14),
    required: true,
    colSpan: 1,
    step: 1,
    presets: [
      { label: "14 dagen (Norm)", value: () => calculateDueDate(14) },
      { label: "30 dagen (Zakelijk)", value: () => calculateDueDate(30) },
      { label: "7 dagen (Spoed)", value: () => calculateDueDate(7) },
      { label: "Direct (Vandaag)", value: () => calculateDueDate(0) },
    ],
    helperText: (values) =>
      values.method === "Factuur (Net 30)"
        ? "Automatisch ingesteld op 30 dagen voor zakelijke facturen"
        : "Automatisch ingesteld op 14 dagen (standaard Nederlandse norm)",
  },
  {
    name: "status",
    label: "Status bij aanmaken",
    type: "select",
    defaultValue: "Pending",
    colSpan: 1,
    step: 1,
    options: [
      {
        label: "Pending (Openstaand - gereed om te sturen)",
        value: "Pending",
      },
      { label: "Paid (Reeds direct voldaan op locatie)", value: "Paid" },
      { label: "Draft (Concept - nog niet definitief)", value: "Draft" },
    ],
  },
];
