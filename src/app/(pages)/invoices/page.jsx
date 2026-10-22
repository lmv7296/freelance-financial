"use client";

import {
  Check,
  Copy,
  Download,
  ExternalLink,
  FilePlus2,
  FileText,
  Mail,
  Plus,
  Search,
} from "lucide-react";
import { useMemo, useState } from "react";
import { FormModal } from "@/components/FormModal";
import { InfoModal } from "@/components/InfoModal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

// Invoices spanning Electricians, Plumbers, Market Stalls (Marktkooplieden), Homeowners, and Local Businesses
const INITIAL_INVOICES = [
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

const STATUS_FILTERS = ["All", "Pending", "Paid", "Overdue", "Draft"];

// Schema for Create Invoice FormModal
const CREATE_INVOICE_FIELDS = [
  {
    name: "client",
    label: "Customer / Client Name",
    placeholder: "e.g. Mark & Sophie van Beek or De Kaasboer",
    required: true,
    colSpan: 1,
  },
  {
    name: "tradeType",
    label: "Trade or Specialty",
    type: "select",
    required: true,
    colSpan: 1,
    options: [
      { label: "Electrician", value: "Electrician" },
      { label: "Market Trader (Markt)", value: "Market Trader (Markt)" },
      { label: "Plumber", value: "Plumber" },
      { label: "General Contractor / Vakman", value: "Contractor" },
      { label: "Commercial / Facility", value: "Commercial" },
    ],
    defaultValue: "Electrician",
  },
  {
    name: "project",
    label: "Job Description / Market Batch",
    placeholder:
      "e.g. Fuse box upgrade, emergency pipe repair, Saturday stall batch #20",
    required: true,
    colSpan: 2,
  },
  {
    name: "amount",
    label: "Total Amount (€)",
    prefix: "€",
    placeholder: "0.00",
    required: true,
    colSpan: 1,
  },
  {
    name: "method",
    label: "Payment Rail / Method",
    type: "select",
    colSpan: 1,
    options: [
      { label: "PIN / Tap Terminal (On site)", value: "PIN / Tap Terminal" },
      { label: "Tikkie / iDEAL QR", value: "Tikkie / iDEAL QR" },
      { label: "Factuur (Net 14)", value: "Factuur (Net 14)" },
      { label: "Factuur (Net 30)", value: "Factuur (Net 30)" },
      { label: "Contant (Cash) & PIN", value: "Contant (Cash) & PIN" },
    ],
    defaultValue: "PIN / Tap Terminal",
  },
  {
    name: "due",
    label: "Payment Due Date",
    type: "date",
    required: true,
    colSpan: 1,
  },
  {
    name: "status",
    label: "Initial Status",
    type: "select",
    colSpan: 1,
    options: [
      { label: "Pending (Due)", value: "Pending" },
      { label: "Paid (Settled)", value: "Paid" },
      { label: "Draft (Unsent)", value: "Draft" },
    ],
    defaultValue: "Pending",
  },
  {
    name: "notes",
    label: "Job Notes / VAT Specification",
    type: "textarea",
    placeholder:
      "e.g. Includes 21% BTW, 2 hours labor + parts (NEN 3140 verified)...",
    rows: 2,
    colSpan: 2,
  },
];

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState(INITIAL_INVOICES);
  const [activeFilter, setActiveFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState(null);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedInvoiceForInfo, setSelectedInvoiceForInfo] = useState(null);

  // Filter invoices based on status tab and search query
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const matchesFilter =
        activeFilter === "All" || inv.status === activeFilter;
      const matchesSearch =
        inv.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.project.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.tradeType.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [invoices, activeFilter, searchQuery]);

  // Aggregate stats
  const pendingCount = invoices.filter((i) => i.status === "Pending").length;
  const overdueCount = invoices.filter((i) => i.status === "Overdue").length;

  const handleCopyLink = (id) => {
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCreateInvoice = (formData) => {
    let rawAmount = String(formData.amount || "0").replace(/[^\d.,]/g, "");
    if (!rawAmount.startsWith("€")) rawAmount = `€${rawAmount}`;
    if (!rawAmount.includes(".")) rawAmount = `${rawAmount}.00`;

    const newInvoice = {
      id: `INV-${Math.floor(2050 + Math.random() * 500)}`,
      client: formData.client,
      tradeType: formData.tradeType || "Electrician",
      project: formData.project,
      issued: "Oct 13, 2026",
      due: formData.due || "Oct 27, 2026",
      dueDateRelative:
        formData.status === "Paid"
          ? "Paid on creation"
          : formData.status === "Draft"
            ? "Unsent Draft"
            : "Due in 14 days",
      amount: rawAmount,
      status: formData.status || "Pending",
      method: formData.method || "PIN / Tap Terminal",
    };

    setInvoices((prev) => [newInvoice, ...prev]);
    setIsCreateModalOpen(false);
  };

  const getStatusChip = (status) => {
    switch (status) {
      case "Paid":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold border bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/25">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            Paid
          </span>
        );
      case "Pending":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold border bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/25">
            <span className="size-1.5 rounded-full bg-amber-500 animate-pulse" />
            Pending
          </span>
        );
      case "Overdue":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold border bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/25">
            <span className="size-1.5 rounded-full bg-rose-500 animate-pulse" />
            Overdue
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold border bg-muted text-muted-foreground border-border/60">
            <span className="size-1.5 rounded-full bg-muted-foreground" />
            Draft
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background p-6 md:p-8 space-y-6 font-sans">
      {/* 1. Header Section */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Invoices & Billing
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Track issued jobs, market batches, pending PIN settlements, and
            Tikkie / bank receipts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => alert("Exporting CSV report...")}
            className="rounded-full px-4 shadow-xs hover:bg-muted/60 active:scale-[0.97] transition-all font-medium text-xs h-9 cursor-pointer"
          >
            <Download className="size-3.5 mr-1.5" />
            Export CSV
          </Button>
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            className="rounded-full px-4.5 shadow-sm hover:shadow-md active:scale-[0.97] transition-all font-semibold text-xs h-9 cursor-pointer"
          >
            <Plus className="size-4 mr-1.5" />
            New Invoice / Bill
          </Button>
        </div>
      </div>

      {/* 2. Key Metrics Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card
          title="Total Billed"
          description="Aggregate invoiced & sales YTD"
          value="€28,790.00"
          trend="+16.4%"
          trendLabel="vs last quarter"
          variant="elevated"
        />

        <Card
          title="Awaiting Settlement"
          description={`${pendingCount} invoices & orders pending`}
          value="€4,090.00"
          trend="Due in 12-14 days"
          trendDirection="neutral"
          variant="elevated"
        />

        <Card
          title="Overdue Balance"
          description={`${overdueCount} account requiring notice`}
          value="€620.00"
          trend="Action required"
          trendDirection="down"
          variant="elevated"
        />

        <Card
          title="Settled this Month"
          description="Completed PIN, Tikkie & bank payouts"
          value="€14,850.00"
          trend="+11.2%"
          trendLabel="vs previous cycle"
          variant="elevated"
        />
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {STATUS_FILTERS.map((filter) => {
            const count =
              filter === "All"
                ? invoices.length
                : invoices.filter((i) => i.status === filter).length;
            const isActive = activeFilter === filter;

            return (
              <button
                key={filter}
                type="button"
                onClick={() => setActiveFilter(filter)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-150 cursor-pointer ${
                  isActive
                    ? "bg-foreground text-background shadow-xs"
                    : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/40"
                }`}
              >
                <span>{filter}</span>
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
        <div className="relative w-full sm:w-72">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search invoice, client, or trade..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-xs rounded-full"
          />
        </div>
      </div>

      {/* 4. Invoices Table Card */}
      <Card variant="elevated" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm font-sans border-collapse">
            <thead>
              <tr className="border-b border-border/70 bg-muted/40 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                <th className="py-3 px-5">Invoice</th>
                <th className="py-3 px-5">Client & Job / Order</th>
                <th className="py-3 px-5">Issued / Due</th>
                <th className="py-3 px-5 text-right">Amount</th>
                <th className="py-3 px-5 text-center">Status</th>
                <th className="py-3 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 text-xs">
              {filteredInvoices.length > 0 ? (
                filteredInvoices.map((inv) => (
                  <tr
                    key={inv.id}
                    className="hover:bg-muted/30 transition-colors group"
                  >
                    {/* Invoice ID & Method */}
                    <td className="py-3.5 px-5 font-mono font-medium text-foreground">
                      <div className="flex items-center gap-2">
                        <FileText className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        <div>
                          <p className="font-semibold text-foreground">
                            {inv.id}
                          </p>
                          <p className="text-[10px] text-muted-foreground font-sans">
                            {inv.method}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Client & Job/Order Description */}
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-1.5">
                        <p className="font-semibold text-foreground">
                          {inv.client}
                        </p>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-muted text-muted-foreground font-medium">
                          {inv.tradeType}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                        {inv.project}
                      </p>
                    </td>

                    {/* Issued & Due Dates */}
                    <td className="py-3.5 px-5">
                      <p className="font-medium text-foreground">{inv.due}</p>
                      <p
                        className={`text-[10px] ${
                          inv.status === "Overdue"
                            ? "text-rose-600 font-semibold"
                            : "text-muted-foreground"
                        }`}
                      >
                        {inv.dueDateRelative}
                      </p>
                    </td>

                    {/* Amount */}
                    <td className="py-3.5 px-5 text-right font-mono font-bold text-sm text-foreground tabular-nums">
                      {inv.amount}
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-5 text-center">
                      {getStatusChip(inv.status)}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Copy Link Button */}
                        <button
                          type="button"
                          onClick={() => handleCopyLink(inv.id)}
                          className="size-7 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                          title="Copy payment / Tikkie link"
                        >
                          {copiedId === inv.id ? (
                            <Check className="size-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="size-3.5" />
                          )}
                        </button>

                        {/* Remind */}
                        {inv.status === "Overdue" ||
                        inv.status === "Pending" ? (
                          <button
                            type="button"
                            onClick={() =>
                              alert(`Sent payment reminder to ${inv.client}`)
                            }
                            className="size-7 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                            title="Send payment reminder"
                          >
                            <Mail className="size-3.5" />
                          </button>
                        ) : null}

                        {/* View Invoice -> Opens InfoModal */}
                        <button
                          type="button"
                          onClick={() => setSelectedInvoiceForInfo(inv)}
                          className="size-7 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                          title="View invoice details"
                        >
                          <ExternalLink className="size-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={6}
                    className="py-12 text-center text-muted-foreground"
                  >
                    <p className="text-sm font-medium">
                      No invoices match your filter
                    </p>
                    <p className="text-xs mt-1">
                      Try resetting the search or filter tabs.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 5. Reusable FormModal: Create Invoice (Entirely Driven by Props) */}
      <FormModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateInvoice}
        title="Create Invoice / Bill"
        description="Draft a bill for trade services, market stall orders, or direct on-site jobs."
        icon={<FilePlus2 className="size-5" />}
        fields={CREATE_INVOICE_FIELDS}
        submitLabel="Issue Invoice"
        maxWidth="lg"
        footerNote="Invoices are logged in your VAT (BTW) ledger and can be shared via Tikkie link or PDF."
      />

      {/* 6. Reusable InfoModal: View Invoice Information (Entirely Driven by Props) */}
      {selectedInvoiceForInfo && (
        <InfoModal
          isOpen={Boolean(selectedInvoiceForInfo)}
          onClose={() => setSelectedInvoiceForInfo(null)}
          title={`Invoice ${selectedInvoiceForInfo.id}`}
          description={`${selectedInvoiceForInfo.client} • ${selectedInvoiceForInfo.tradeType}`}
          badge={selectedInvoiceForInfo.status}
          icon={<FileText className="size-5" />}
          maxWidth="lg"
          banner={
            selectedInvoiceForInfo.status === "Overdue"
              ? {
                  type: "destructive",
                  title: "Payment Overdue",
                  message: `This bill was due on ${selectedInvoiceForInfo.due}. A polite reminder can be sent.`,
                }
              : undefined
          }
          items={[
            {
              label: "Invoice ID",
              value: selectedInvoiceForInfo.id,
              copyable: true,
            },
            {
              label: "Customer / Account",
              value: selectedInvoiceForInfo.client,
            },
            {
              label: "Trade / Specialty",
              value: selectedInvoiceForInfo.tradeType,
            },
            {
              label: "Total Amount",
              value: selectedInvoiceForInfo.amount,
              isMoney: true,
              highlight:
                selectedInvoiceForInfo.status === "Paid"
                  ? "success"
                  : selectedInvoiceForInfo.status === "Overdue"
                    ? "destructive"
                    : "warning",
            },
            {
              label: "Payment Rail",
              value: selectedInvoiceForInfo.method,
            },
            {
              label: "Issued Date",
              value: selectedInvoiceForInfo.issued,
            },
            {
              label: "Due Date",
              value: selectedInvoiceForInfo.due,
            },
            {
              label: "Status / Timing",
              value: selectedInvoiceForInfo.dueDateRelative,
            },
            {
              label: "Job / Order Description",
              value: selectedInvoiceForInfo.project,
              colSpan: 2,
            },
          ]}
          footerActions={[
            {
              label: "Close",
              variant: "outline",
              onClick: () => setSelectedInvoiceForInfo(null),
            },
            {
              label: "Copy Tikkie Link",
              variant: "secondary",
              onClick: () => {
                navigator.clipboard?.writeText(
                  `https://pay.tikkie.me/trade/${selectedInvoiceForInfo.id}`,
                );
                alert("Tikkie payment link copied to clipboard!");
              },
            },
            {
              label: "Download PDF",
              variant: "default",
              onClick: () => {
                alert(`Downloading PDF for ${selectedInvoiceForInfo.id}...`);
              },
            },
          ]}
        />
      )}
    </div>
  );
}
