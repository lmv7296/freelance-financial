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
 * Titles, labels and placeholders are translation keys; FormModal translates them.
 */
export const CREATE_INVOICE_STEPS = [
  {
    id: "klant",
    title: "invoiceForm.steps.client.title",
    description: "invoiceForm.steps.client.description",
  },
  {
    id: "opbouw",
    title: "invoiceForm.steps.build.title",
    description: "invoiceForm.steps.build.description",
  },
  {
    id: "preview",
    title: "invoiceForm.steps.preview.title",
    description: "invoiceForm.steps.preview.description",
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
    label: "invoiceForm.clientType",
    type: "switch",
    required: true,
    colSpan: 2,
    step: 0,
    defaultValue: "particulier",
    options: [
      {
        value: "particulier",
        label: "invoiceForm.person",
      },
      {
        value: "bedrijf",
        label: "invoiceForm.company",
      },
    ],
  },

  // --- Particulier: Klantgegevens ---
  {
    name: "clientName",
    label: "invoiceForm.clientName",
    type: "custom",
    required: true,
    showIf: (values) => values.clientType === "particulier",
    colSpan: 1,
    step: 0,
    render: (formValues, { handleChange, errors, setFormValues }) => (
      <ClientAutocomplete
        clientType="particulier"
        name="clientName"
        label="invoiceForm.clientName"
        placeholder="invoiceForm.clientNamePlaceholder"
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
    label: "invoiceForm.clientPhone",
    type: "tel",
    placeholder: "invoiceForm.phonePlaceholder",
    showIf: (values) => values.clientType === "particulier",
    colSpan: 1,
    step: 0,
  },
  {
    name: "clientEmail",
    label: "invoiceForm.clientEmail",
    type: "email",
    placeholder: "invoiceForm.clientEmailPlaceholder",
    showIf: (values) => values.clientType === "particulier",
    colSpan: 1,
    step: 0,
  },
  {
    name: "clientAddress",
    label: "invoiceForm.clientAddress",
    type: "text",
    placeholder: "invoiceForm.clientAddressPlaceholder",
    showIf: (values) => values.clientType === "particulier",
    colSpan: 1,
    step: 0,
  },

  // --- Bedrijf: Bedrijfsgegevens ---
  {
    name: "companyName",
    label: "invoiceForm.companyName",
    type: "custom",
    required: true,
    showIf: (values) => values.clientType === "bedrijf",
    colSpan: 1,
    step: 0,
    render: (formValues, { handleChange, errors, setFormValues }) => (
      <ClientAutocomplete
        clientType="bedrijf"
        name="companyName"
        label="invoiceForm.companyName"
        placeholder="invoiceForm.companyNamePlaceholder"
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
    label: "invoiceForm.contactPerson",
    placeholder: "invoiceForm.contactPersonPlaceholder",
    showIf: (values) => values.clientType === "bedrijf",
    colSpan: 1,
    step: 0,
  },
  {
    name: "vatNumber",
    label: "invoiceForm.vatNumber",
    placeholder: "invoiceForm.vatNumberPlaceholder",
    showIf: (values) => values.clientType === "bedrijf",
    colSpan: 1,
    step: 0,
  },
  {
    name: "kvkNumber",
    label: "invoiceForm.kvkNumber",
    placeholder: "invoiceForm.kvkNumberPlaceholder",
    showIf: (values) => values.clientType === "bedrijf",
    colSpan: 1,
    step: 0,
  },
  {
    name: "companyEmail",
    label: "invoiceForm.companyEmail",
    type: "email",
    placeholder: "invoiceForm.companyEmailPlaceholder",
    showIf: (values) => values.clientType === "bedrijf",
    colSpan: 1,
    step: 0,
  },
  {
    name: "companyPhone",
    label: "invoiceForm.companyPhone",
    type: "tel",
    placeholder: "invoiceForm.companyPhonePlaceholder",
    showIf: (values) => values.clientType === "bedrijf",
    colSpan: 1,
    step: 0,
  },
  {
    name: "companyAddress",
    label: "invoiceForm.companyAddress",
    type: "text",
    placeholder: "invoiceForm.companyAddressPlaceholder",
    showIf: (values) => values.clientType === "bedrijf",
    colSpan: 2,
    step: 0,
  },

  // ==========================================
  // --- STAP 2: Opbouw Factuur (Vakgebied, Regels, BTW, Betaalwijze, Termijn) ---
  // ==========================================
  {
    name: "tradeType",
    label: "invoiceForm.tradeType",
    type: "select",
    required: true,
    colSpan: 1,
    step: 1,
    defaultValue: "Electrician",
    options: TRADE_TYPES,
  },
  {
    name: "invoiceNumber",
    label: "invoiceForm.invoiceNumber",
    type: "text",
    required: true,
    colSpan: 1,
    step: 1,
    defaultValue: "INV-2047",
    placeholder: "invoiceForm.invoiceNumberPlaceholder",
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
    label: "invoiceForm.vatRate",
    type: "select",
    defaultValue: "21",
    colSpan: 1,
    step: 1,
    options: VAT_RATES,
  },
  {
    name: "method",
    label: "invoiceForm.method",
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
    label: "invoiceForm.due",
    type: "date",
    defaultValue: () => calculateDueDate(14),
    required: true,
    colSpan: 1,
    step: 1,
    presets: [
      { label: "invoiceForm.presets.14", value: () => calculateDueDate(14) },
      { label: "invoiceForm.presets.30", value: () => calculateDueDate(30) },
      { label: "invoiceForm.presets.7", value: () => calculateDueDate(7) },
      { label: "invoiceForm.presets.0", value: () => calculateDueDate(0) },
    ],
    helperText: (values) =>
      values.method === "Factuur (Net 30)"
        ? "invoiceForm.dueHint30"
        : "invoiceForm.dueHint14",
  },
  {
    name: "status",
    label: "invoiceForm.status",
    type: "select",
    defaultValue: "Pending",
    colSpan: 1,
    step: 1,
    options: [
      { label: "invoiceForm.statusPending", value: "Pending" },
      { label: "invoiceForm.statusPaid", value: "Paid" },
      { label: "invoiceForm.statusDraft", value: "Draft" },
    ],
  },
];
