"use client";

import { ArrowUpRight, MoreVertical, Plus } from "lucide-react";
import { useState } from "react";
import { TimeFilterDropdown } from "@/components/TimeFilterDropdown";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function DashboardPage() {
  const [revenuePeriod, setRevenuePeriod] = useState("30d");

  const revenueData = {
    "30d": {
      value: "€14,850.00",
      trend: "+14.2%",
      trendLabel: "vs last month",
      description: "Net takings & billed jobs (past 30 days)",
    },
    "90d": {
      value: "€42,120.00",
      trend: "+21.5%",
      trendLabel: "vs last quarter",
      description: "Net takings & billed jobs (past 90 days)",
    },
    "6m": {
      value: "€81,400.00",
      trend: "+18.8%",
      trendLabel: "vs previous 6 months",
      description: "Net takings & billed jobs (past 6 months)",
    },
    "12m": {
      value: "€156,200.00",
      trend: "+31.4%",
      trendLabel: "vs previous year",
      description: "Net takings & billed jobs (past 12 months)",
    },
  };

  const currentRevenue = revenueData[revenuePeriod] || revenueData["30d"];

  return (
    <div className="min-h-screen bg-background p-6 md:p-8 space-y-6 font-sans">
      {/* Page Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Financial Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Monitor your trade jobs, market stall sales, pending invoices, and
            customer accounts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="rounded-full px-5 shadow-xs hover:bg-muted/60 active:scale-[0.97] transition-all font-medium text-xs h-9"
          >
            Download Report
          </Button>
          <Button
            onClick={() => alert("Open new invoice or sale modal")}
            className="rounded-full px-5 shadow-sm hover:shadow-md active:scale-[0.97] transition-all font-semibold text-xs h-9"
          >
            <Plus className="size-4 mr-1.5" />
            New Invoice / Sale
          </Button>
        </div>
      </div>

      {/* Row 1: Key Metric Cards (Clean, Bottom-Pinned Comparison, No Badges) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Metric Card 1: Revenue with Time Filter Dropdown */}
        <Card
          title="Total Revenue"
          description={currentRevenue.description}
          value={currentRevenue.value}
          trend={currentRevenue.trend}
          trendLabel={currentRevenue.trendLabel}
          headerAction={
            <TimeFilterDropdown
              value={revenuePeriod}
              onChange={(id) => setRevenuePeriod(id)}
            />
          }
          variant="elevated"
        />

        {/* Metric Card 2: Pending Payments */}
        <Card
          title="Pending Payments"
          description="3 invoices & orders awaiting settlement"
          value="€4,090.00"
          trend="-2.4%"
          trendLabel="vs last week"
          variant="elevated"
        />

        {/* Metric Card 3: Active Customers */}
        <Card
          title="Active Customers"
          description="Homeowners, market stalls & B2B accounts"
          value="48"
          trend="+5"
          trendLabel="new this month"
          variant="elevated"
        />

        {/* Metric Card 4: Quick Action Tile */}
        <Card
          title="Create Invoice / Bill"
          description="Draft and send a job or market ticket"
          interactive
          variant="elevated"
          onClick={() => alert("Open new invoice modal")}
          footer="Fast checkout enabled"
          footerActions={
            <Button
              size="sm"
              variant="ghost"
              className="rounded-full text-xs font-semibold hover:bg-primary/10 active:scale-[0.97] transition-all"
            >
              Start <ArrowUpRight className="size-3.5 ml-1" />
            </Button>
          }
        >
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            Generate on-site PIN receipts, Tikkie / iDEAL QR links, or VAT
            invoices.
          </p>
        </Card>
      </div>

      {/* Row 2: Content Cards with Children, Headers, and Footers */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Card 5: Recent Transactions with children list */}
        <div className="lg:col-span-2">
          <Card
            title="Recent Invoices & Takings"
            description="Overview of your latest trade jobs and market orders"
            headerAction={
              <Button
                variant="ghost"
                size="icon"
                className="size-8 rounded-full text-muted-foreground hover:bg-muted"
              >
                <MoreVertical className="size-4" />
              </Button>
            }
            variant="elevated"
            footer="Updated 5 minutes ago"
            footerActions={
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.assign("/invoices")}
                className="rounded-full text-xs font-medium active:scale-[0.97]"
              >
                View All
              </Button>
            }
          >
            <div className="divide-y divide-border/40">
              {[
                {
                  client: "Mark & Sophie van Beek",
                  tag: "Electrician",
                  id: "INV-2044",
                  desc: "3-Phase Fuse Box Upgrade",
                  date: "Today",
                  amount: "€1,450.00",
                  status: "Paid",
                },
                {
                  client: "De Kaasboer (Market Stall 14)",
                  tag: "Marktkoopman",
                  id: "INV-2045",
                  desc: "Weekly Market Cheese Batch #42",
                  date: "Yesterday",
                  amount: "€1,240.00",
                  status: "Pending",
                },
                {
                  client: "Arthur & Claire Pendleton",
                  tag: "Plumber",
                  id: "INV-2041",
                  desc: "Emergency Pipe Burst Repair",
                  date: "Oct 11",
                  amount: "€480.00",
                  status: "Paid",
                },
                {
                  client: "Koraal Vastgoedbeheer",
                  tag: "B2B Facilities",
                  id: "INV-2046",
                  desc: "Multi-Unit Electrical Inspection",
                  date: "Oct 10",
                  amount: "€2,850.00",
                  status: "Pending",
                },
              ].map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between py-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">
                        {inv.client}
                      </p>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-muted text-muted-foreground font-medium">
                        {inv.tag}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {inv.id} • {inv.desc} • {inv.date}
                    </p>
                  </div>
                  <div className="text-right flex flex-col items-end gap-1">
                    <p className="text-sm font-bold text-foreground tabular-nums">
                      {inv.amount}
                    </p>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold border ${
                        inv.status === "Paid"
                          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/25"
                          : "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/25"
                      }`}
                    >
                      <span
                        className={`size-1.5 rounded-full ${inv.status === "Paid" ? "bg-emerald-500" : "bg-amber-500"}`}
                      />
                      {inv.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Card 6: Tax & Withholding Summary (Quarterly VAT / Belastingdienst Prep) */}
        <Card
          title="Tax Vault & VAT (BTW)"
          description="Estimated reserve for Q4 filing"
          variant="elevated"
          badge="Estimated"
          badgeVariant="outline"
          footer="Calculated from gross turnover"
          footerActions={
            <Button
              size="sm"
              className="rounded-full text-xs font-semibold shadow-xs active:scale-[0.97]"
            >
              Adjust
            </Button>
          }
        >
          <div className="space-y-4 py-2">
            <div>
              <p className="text-2xl font-bold tracking-tight text-foreground font-sans tabular-nums">
                €3,712.50
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Set aside for quarterly VAT (BTW 21%/9%) & income tax
              </p>
            </div>
            <div className="h-2 w-full rounded-full bg-muted/80 overflow-hidden p-0.5 border border-border/40">
              <div className="h-full bg-primary rounded-full w-3/4 shadow-xs" />
            </div>
            <p className="text-xs text-muted-foreground font-medium">
              75% of your recommended quarterly reserve reached.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
