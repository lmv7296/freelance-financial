/**
 * Invoice dataset, filters, default line items and constants.
 * Reusable across Invoices, Dashboard, Analytics and Export pages.
 */

export const INITIAL_INVOICES = [
  {
    id: "INV-2046",
    client: "Koraal Vastgoedbeheer (Property Mgmt)",
    tradeType: "Electrician",
    project: "Multi-Unit Electrical Inspection & Emergency Lighting",
    issued: "Oct 12, 2026",
    due: "Oct 26, 2026",
    dueDateRelative: "Due in 14 days",
    amount: "€2,850.00",
    status: "Pending",
    method: "Factuur (Net 30)",
  },
  {
    id: "INV-2045",
    client: "De Kaasboer (Market Stall 14)",
    tradeType: "Market Trader (Markt)",
    project: "Weekly Market Stall Cheese & Dairy Batch #42",
    issued: "Oct 10, 2026",
    due: "Oct 24, 2026",
    dueDateRelative: "Due in 12 days",
    amount: "€1,240.00",
    status: "Pending",
    method: "PIN / Tap Terminal",
  },
  {
    id: "INV-2044",
    client: "Mark & Sophie van Beek",
    tradeType: "Electrician",
    project: "3-Phase Fuse Box Upgrade & EV Wallbox Installation",
    issued: "Oct 06, 2026",
    due: "Oct 20, 2026",
    dueDateRelative: "Paid Oct 08",
    amount: "€1,450.00",
    status: "Paid",
    method: "Tikkie / iDEAL QR",
  },
  {
    id: "INV-2043",
    client: "Bistro De Waag",
    tradeType: "Plumber",
    project: "Commercial Kitchen Line Flushing & Grease Trap Servicing",
    issued: "Sep 20, 2026",
    due: "Oct 04, 2026",
    dueDateRelative: "Overdue by 8 days",
    amount: "€620.00",
    status: "Overdue",
    method: "Factuur (Net 14)",
  },
  {
    id: "INV-2042",
    client: "Bakkerij 't Stoepje (Pitch 22)",
    tradeType: "Market Trader (Markt)",
    project: "Saturday Market Fresh Produce Batch #19",
    issued: "Sep 28, 2026",
    due: "Oct 12, 2026",
    dueDateRelative: "Paid Oct 04",
    amount: "€890.00",
    status: "Paid",
    method: "Contant (Cash) & PIN",
  },
  {
    id: "INV-2041",
    client: "Arthur & Claire Pendleton",
    tradeType: "Plumber",
    project: "Emergency Water Pipe Burst & Valve Replacement",
    issued: "Sep 24, 2026",
    due: "Oct 08, 2026",
    dueDateRelative: "Paid Sep 25",
    amount: "€480.00",
    status: "Paid",
    method: "PIN on Site (Tap)",
  },
  {
    id: "INV-2040",
    client: "Elena Rostova",
    tradeType: "Electrician",
    project: "Living Room LED Rail Wiring & Short-Circuit Fix",
    issued: "Sep 15, 2026",
    due: "Sep 29, 2026",
    dueDateRelative: "Paid Sep 20",
    amount: "€540.00",
    status: "Paid",
    method: "Tikkie / Instant QR",
  },
  {
    id: "INV-2039",
    client: "Jan de Marktman (Bloemen & Planten)",
    tradeType: "Market Trader (Markt)",
    project: "Pitch Power Distribution Box & Weatherproof Cabling",
    issued: "Oct 11, 2026",
    due: "Oct 25, 2026",
    dueDateRelative: "Unsent Draft",
    amount: "€720.00",
    status: "Draft",
    method: "Factuur / Direct Bank",
  },
];

export const STATUS_FILTERS = ["All", "Pending", "Paid", "Overdue", "Draft"];

export const DEFAULT_LINE_ITEMS = [
  {
    id: "item-1",
    description: "Installatie- en montage-uren op locatie",
    quantity: 2,
    unitPrice: "65.00",
  },
  {
    id: "item-2",
    description: "Materialen, bekabeling en kleinverbruik",
    quantity: 1,
    unitPrice: "45.00",
  },
];

export const TRADE_TYPES = [
  { label: "Elektricien (Elektra & Groepenkasten)", value: "Electrician" },
  { label: "Loodgieter (Sanitair & CV)", value: "Plumber" },
  {
    label: "Marktkoopman (Markt & Ambulante Handel)",
    value: "Market Trader (Markt)",
  },
  { label: "Algemeen Vakman / Aannemer", value: "Contractor" },
  { label: "Vastgoedbeheer / Commercieel", value: "Commercial" },
];

export const PAYMENT_METHODS = [
  {
    label: "Tikkie / iDEAL QR (Direct digitaal betaalverzoek)",
    value: "Tikkie / iDEAL QR",
  },
  {
    label: "Factuur (Net 14 dagen overschrijving)",
    value: "Factuur (Net 14)",
  },
  {
    label: "Factuur (Net 30 dagen zakelijk)",
    value: "Factuur (Net 30)",
  },
  { label: "PIN op Locatie (Tap to Pay)", value: "PIN / Tap Terminal" },
  { label: "Contant (Cash) & PIN", value: "Contant (Cash) & PIN" },
];

export const VAT_RATES = [
  { label: "21% BTW (Standaard tarief)", value: "21" },
  { label: "9% BTW (Laag tarief - isolatie/schilder)", value: "9" },
  { label: "0% BTW (Vrijgesteld / BTW-verlegd)", value: "0" },
];
