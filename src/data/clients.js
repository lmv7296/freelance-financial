// Turns backend clients (GET /api/v1/clients) and their invoices into the
// records the Klanten page shows, and form values into API input.

/**
 * Invoice status as the UI shows it. A sent invoice past its due date is "Overdue".
 *
 * @param {{ status: string; due_date?: string }} invoice
 * @param {string | null} today - YYYY-MM-DD, or null before data loaded
 * @returns {"Paid" | "Pending" | "Overdue" | "Draft" | "Cancelled"}
 */
export function invoiceDisplayStatus(invoice, today) {
  switch (invoice.status) {
    case "PAID":
      return "Paid";
    case "DRAFT":
      return "Draft";
    case "CANCELLED":
      return "Cancelled";
    default:
      return today && invoice.due_date && invoice.due_date < today
        ? "Overdue"
        : "Pending";
  }
}

/**
 * @param {import("@/lib/api/clients").Client} client
 * @param {import("@/lib/api/invoices").Invoice[]} invoices - all invoices; only this client's are used
 * @param {string | null} today - YYYY-MM-DD
 */
export function toClientView(client, invoices, today) {
  const own = invoices.filter((inv) => inv.client_id === client.id);
  // Drafts and cancelled invoices haven't been billed
  const billed = own.filter(
    (inv) => inv.status === "SENT" || inv.status === "PAID",
  );
  const sum = (list) =>
    list.reduce((acc, inv) => acc + (inv.total_cents ?? 0), 0);
  const open = billed.filter((inv) => inv.status === "SENT");

  return {
    id: client.id,
    type: client.type || "particulier",
    name: client.name,
    email: client.email || "",
    phone: client.phone || "",
    kvk: client.kvk_number || "",
    btw: client.vat_number || "",
    contactPerson: client.contact_person || "",
    addressLine1: client.address_line1 || "",
    addressLine2: client.address_line2 || "",
    siteNote: client.site_note || "",
    invoicedCents: sum(billed),
    unpaidCents: sum(open),
    invoicesCount: billed.length,
    invoices: own.map((inv) => ({
      id: inv.id,
      number: inv.invoice_number,
      issueDate: inv.issue_date,
      totalCents: inv.total_cents ?? 0,
      status: invoiceDisplayStatus(inv, today),
    })),
  };
}

/**
 * Form values from the "Nieuwe klant" wizard → POST /api/v1/clients body.
 * Business-only fields are left out for a private client.
 */
export function toClientInput(formData) {
  const isBusiness = formData.type === "bedrijf";
  const text = (value) => (typeof value === "string" ? value.trim() : "");
  return {
    type: isBusiness ? "bedrijf" : "particulier",
    name: text(formData.name),
    phone: text(formData.phone),
    email: text(formData.email),
    address_line1: text(formData.addressLine1),
    address_line2: text(formData.addressLine2),
    site_note: text(formData.siteNote),
    ...(isBusiness && {
      kvk_number: text(formData.kvk).replace(/\s/g, ""),
      vat_number: text(formData.btw),
      contact_person: text(formData.contactPerson),
    }),
  };
}

/**
 * Filters a list of clients by active filter tab and text search query.
 *
 * @param {Array<ReturnType<typeof toClientView>>} clients
 * @param {string} activeTab
 * @param {string} searchQuery
 */
export function filterClients(clients, activeTab, searchQuery = "") {
  if (!Array.isArray(clients)) return [];
  const query = searchQuery.trim().toLowerCase();

  return clients.filter((client) => {
    if (query) {
      const matchesSearch = [
        client.name,
        client.addressLine1,
        client.addressLine2,
        client.phone,
        client.email,
        client.contactPerson,
        client.kvk,
      ].some((v) => v?.toLowerCase().includes(query));

      if (!matchesSearch) return false;
    }

    if (activeTab === "particulier") return client.type === "particulier";
    if (activeTab === "bedrijf") return client.type === "bedrijf";
    if (activeTab === "unpaid") return client.unpaidCents > 0;
    return true;
  });
}

/**
 * Calculates client category counts for tab badges.
 *
 * @param {Array<ReturnType<typeof toClientView>>} clients
 */
export function getClientCounts(clients) {
  if (!Array.isArray(clients)) {
    return { total: 0, particulierCount: 0, bedrijfCount: 0, unpaidCount: 0 };
  }
  return {
    total: clients.length,
    particulierCount: clients.filter((c) => c.type === "particulier").length,
    bedrijfCount: clients.filter((c) => c.type === "bedrijf").length,
    unpaidCount: clients.filter((c) => c.unpaidCents > 0).length,
  };
}
