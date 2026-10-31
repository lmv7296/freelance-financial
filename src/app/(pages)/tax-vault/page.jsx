"use client";

import {
  AlertTriangle,
  CalendarClock,
  FileDown,
  Info,
  Landmark,
  Percent,
  PiggyBank,
  RefreshCw,
  ServerCrash,
  Settings2,
  Wallet,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { DeadlinesCard } from "@/components/tax-vault/DeadlinesCard";
import { ExportModal } from "@/components/tax-vault/ExportModal";
import { ExportsCard } from "@/components/tax-vault/ExportsCard";
import { IncomeTaxCard } from "@/components/tax-vault/IncomeTaxCard";
import { RulesUsedCard } from "@/components/tax-vault/RulesUsedCard";
import { TaxProfileModal } from "@/components/tax-vault/TaxProfileModal";
import { VatPeriodsCard } from "@/components/tax-vault/VatPeriodsCard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { taxVaultApi } from "@/lib/api/taxVault";
import { formatDutchDate } from "@/lib/dateUtils";
import { formatEuro } from "@/lib/formatCurrency";
import { cn } from "@/lib/utils";

// While an export is being generated, refresh the export list periodically
const EXPORT_POLL_MS = 5_000;

const WARNING_STYLES = {
  info: "bg-blue-500/10 border-blue-500/20 text-blue-800 dark:text-blue-200",
  warning:
    "bg-amber-500/10 border-amber-500/20 text-amber-800 dark:text-amber-200",
  critical:
    "bg-rose-500/10 border-rose-500/20 text-rose-800 dark:text-rose-200",
};

export default function TaxVaultPage() {
  const [year, setYear] = useState(null); // null = let the backend pick the current tax year
  const [overview, setOverview] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [profile, setProfile] = useState(null);
  const [exportFormats, setExportFormats] = useState(null);
  const [exportFormatsError, setExportFormatsError] = useState(null);
  const [exports, setExports] = useState(null);
  const [exportsError, setExportsError] = useState(null);

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [highlightedRule, setHighlightedRule] = useState(null);

  const taxYear = overview?.tax_year ?? year;

  const loadOverview = useCallback(async (selectedYear) => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await taxVaultApi.getOverview(selectedYear ?? undefined);
      setOverview(data);
    } catch (err) {
      setLoadError(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadExports = useCallback(async (forYear) => {
    if (!forYear) return;
    try {
      const res = await taxVaultApi.listExports(forYear);
      setExports(res?.exports ?? []);
      setExportsError(null);
    } catch {
      setExportsError("Exports konden niet geladen worden.");
    }
  }, []);

  useEffect(() => {
    loadOverview(year);
  }, [year, loadOverview]);

  useEffect(() => {
    loadExports(taxYear);
  }, [taxYear, loadExports]);

  // Profile and export formats don't depend on the year
  const loadSettings = useCallback(() => {
    taxVaultApi
      .getProfile()
      .then((res) => setProfile(res?.profile ?? null))
      .catch(() => setProfile(null));
    setExportFormatsError(null);
    taxVaultApi
      .getExportOptions()
      .then((res) => setExportFormats(res?.formats ?? []))
      .catch(() =>
        setExportFormatsError("Exportformaten konden niet geladen worden."),
      );
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleRetry = () => {
    loadOverview(year);
    loadSettings();
  };

  const hasPendingExport = exports?.some((e) => e.status === "pending");
  useEffect(() => {
    if (!hasPendingExport) return;
    const interval = setInterval(() => loadExports(taxYear), EXPORT_POLL_MS);
    return () => clearInterval(interval);
  }, [hasPendingExport, taxYear, loadExports]);

  const rulesByKey = Object.fromEntries(
    (overview?.rules_used ?? []).map((rule) => [rule.key, rule]),
  );
  const formatLabels = Object.fromEntries(
    (exportFormats ?? []).map((f) => [f.key, f.label]),
  );

  const handleShowRule = (key) => {
    setHighlightedRule(key);
    document
      .getElementById(`rule-${key}`)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const handleProfileSaved = (saved) => {
    if (saved) setProfile(saved);
    setIsProfileOpen(false);
    loadOverview(year);
  };

  const handleExportCreated = (created) => {
    setIsExportOpen(false);
    if (created) setExports((prev) => [created, ...(prev ?? [])]);
    loadExports(taxYear);
  };

  // Headline numbers, picked from what the backend returned
  const nextVatPeriod = overview?.vat?.periods?.find(
    (p) => p.status === "open" || p.status === "to_file",
  );
  const projected =
    overview?.income_tax?.projected ?? overview?.income_tax?.to_date ?? null;
  const nextDeadline = overview?.deadlines?.find((d) => d.status !== "done");

  return (
    <div className="min-h-screen bg-background p-6 md:p-8 space-y-6 font-sans">
      {/* 1. Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-mono font-bold tracking-wider uppercase border border-violet-500/25 bg-violet-500/10 text-violet-700 dark:text-violet-300">
              <Wallet className="size-3" />
              Belastingkluis
            </span>
            <span className="text-xs text-muted-foreground font-mono">
              Btw • Inkomstenbelasting • Zvw
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground mt-1">
            Tax Vault
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Wat je ongeveer moet betalen, wanneer, en alles netjes klaar voor je
            boekhouder.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {overview?.available_years?.length > 1 && (
            <select
              aria-label="Belastingjaar"
              value={taxYear ?? ""}
              onChange={(e) => setYear(Number(e.target.value))}
              className="h-9 rounded-full border border-border/80 bg-background px-3 text-xs font-semibold"
            >
              {overview.available_years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          )}
          <Button
            variant="outline"
            onClick={() => setIsProfileOpen(true)}
            className="rounded-full px-4 text-xs h-9"
          >
            <Settings2 className="size-3.5" />
            Instellingen
          </Button>
          <Button
            onClick={() => setIsExportOpen(true)}
            disabled={!overview}
            className="rounded-full px-4 text-xs h-9"
          >
            <FileDown className="size-3.5" />
            Exporteren voor boekhouder
          </Button>
        </div>
      </div>

      {loadError ? (
        <ErrorState error={loadError} onRetry={handleRetry} />
      ) : isLoading && !overview ? (
        <LoadingState />
      ) : overview ? (
        <>
          {/* 2. Disclaimer, profile and backend warnings */}
          <div className="space-y-2">
            <Notice tone="info" icon={Info}>
              Dit zijn <strong>schattingen</strong> op basis van je facturen,
              goedgekeurde uitgaven en de belastingregels van{" "}
              {overview.tax_year} (bronnen onderaan). Het is geen fiscaal
              advies: de echte aangifte doe je met je boekhouder.
              {overview.generated_at &&
                ` Berekend op ${formatDutchDate(overview.generated_at)}.`}
            </Notice>
            {!overview.profile_complete && (
              <Notice tone="warning" icon={Settings2}>
                Je fiscale instellingen zijn nog niet compleet, waardoor de
                schatting minder nauwkeurig is.{" "}
                <button
                  type="button"
                  onClick={() => setIsProfileOpen(true)}
                  className="font-semibold underline cursor-pointer"
                >
                  Vul ze aan
                </button>
              </Notice>
            )}
            {overview.warnings.map((warning) => (
              <Notice
                key={warning.code}
                tone={warning.severity}
                icon={AlertTriangle}
              >
                {warning.message}
              </Notice>
            ))}
          </div>

          {/* 3. Key numbers */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card
              title={
                nextVatPeriod
                  ? `Btw ${nextVatPeriod.label}`
                  : "Btw volgende aangifte"
              }
              description={
                nextVatPeriod
                  ? `Uiterlijk ${formatDutchDate(nextVatPeriod.deadline)}`
                  : overview.vat.enabled
                    ? "Geen open periode"
                    : "Niet van toepassing (KOR)"
              }
              value={nextVatPeriod ? formatEuro(nextVatPeriod.balance) : "—"}
              icon={<Percent className="size-5" />}
              iconColor="violet"
            />
            <Card
              title="Inkomstenbelasting + Zvw"
              description={
                projected ? "Nog te betalen (prognose)" : "Nog niet beschikbaar"
              }
              value={projected ? formatEuro(projected.still_to_pay) : "—"}
              icon={<Landmark className="size-5" />}
              iconColor="blue"
            />
            <Card
              title="Opzij zetten per maand"
              description={
                overview.set_aside
                  ? `Nog ${overview.set_aside.months_remaining} maanden dit jaar`
                  : "Nog niet beschikbaar"
              }
              value={
                overview.set_aside
                  ? formatEuro(overview.set_aside.monthly_amount)
                  : "—"
              }
              icon={<PiggyBank className="size-5" />}
              iconColor="emerald"
            />
            <Card
              title="Volgende deadline"
              description={nextDeadline?.label ?? "Geen openstaande deadlines"}
              value={nextDeadline ? formatDutchDate(nextDeadline.date) : "—"}
              icon={<CalendarClock className="size-5" />}
              iconColor="amber"
            />
          </div>

          {/* 4. Details */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              <IncomeTaxCard
                estimate={overview.income_tax}
                rulesByKey={rulesByKey}
                onShowRule={handleShowRule}
              />
              <VatPeriodsCard vat={overview.vat} />
            </div>
            <div className="space-y-4">
              <SetAsideCard advice={overview.set_aside} />
              <DeadlinesCard deadlines={overview.deadlines} />
              <ExportsCard
                exports={exports}
                error={exportsError}
                formatLabels={formatLabels}
                onNewExport={() => setIsExportOpen(true)}
              />
            </div>
          </div>

          {/* 5. Sources */}
          <RulesUsedCard
            rules={overview.rules_used}
            highlightedKey={highlightedRule}
          />
        </>
      ) : null}

      <TaxProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        onSaved={handleProfileSaved}
      />

      {isExportOpen && overview && (
        <ExportModal
          isOpen
          onClose={() => setIsExportOpen(false)}
          onCreated={handleExportCreated}
          taxYear={overview.tax_year}
          periods={overview.vat.periods}
          formats={exportFormats}
          formatsError={exportFormatsError}
          defaultFormats={profile?.default_export_formats ?? []}
          accountantEmail={profile?.accountant_email ?? null}
        />
      )}
    </div>
  );
}

function SetAsideCard({ advice }) {
  return (
    <Card
      variant="outlined"
      title="Opzij zetten"
      description="Zodat de aanslagen geen verrassing zijn"
      icon={<PiggyBank className="size-5" />}
      iconColor="emerald"
    >
      {!advice ? (
        <p className="text-xs text-muted-foreground">
          Nog geen advies beschikbaar.
        </p>
      ) : (
        <>
          <p className="font-mono text-2xl font-bold tabular-nums text-foreground">
            {formatEuro(advice.monthly_amount)}
            <span className="ml-1 text-xs font-sans font-medium text-muted-foreground">
              per maand
            </span>
          </p>
          <ul className="mt-3 space-y-1 text-xs">
            {advice.components.map((c) => (
              <li key={c.key} className="flex justify-between gap-2">
                <span className="text-muted-foreground">{c.label}</span>
                <span className="font-mono tabular-nums">
                  {formatEuro(c.amount)}
                </span>
              </li>
            ))}
          </ul>
          {advice.explanation && (
            <p className="mt-3 text-[11px] text-muted-foreground">
              {advice.explanation}
            </p>
          )}
        </>
      )}
    </Card>
  );
}

function Notice({ tone = "info", icon: Icon, children }) {
  return (
    <div
      className={cn(
        "flex items-start gap-2.5 rounded-xl border p-3 text-xs leading-relaxed",
        WARNING_STYLES[tone] ?? WARNING_STYLES.info,
      )}
    >
      <Icon className="size-4 shrink-0 mt-0.5" />
      <p>{children}</p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-12 rounded-xl bg-muted" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {["a", "b", "c", "d"].map((key) => (
          <div key={key} className="h-36 rounded-2xl bg-muted" />
        ))}
      </div>
      <div className="h-72 rounded-2xl bg-muted" />
    </div>
  );
}

function ErrorState({ error, onRetry }) {
  const isUnavailable = error?.status === 0 || error?.status === 404;
  return (
    <Card variant="outlined">
      <div className="py-14 px-6 text-center flex flex-col items-center gap-2">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
          <ServerCrash className="size-5" />
        </div>
        <p className="text-sm font-semibold text-foreground">
          {isUnavailable
            ? "De belastingkluis is nog niet beschikbaar"
            : "Belastinggegevens konden niet geladen worden"}
        </p>
        <p className="text-xs text-muted-foreground max-w-sm">
          {isUnavailable
            ? "De server voor belastingschattingen is (nog) niet bereikbaar. We tonen geen cijfers zonder actuele regels."
            : error?.message}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="mt-2 rounded-full text-xs"
        >
          <RefreshCw />
          Opnieuw proberen
        </Button>
      </div>
    </Card>
  );
}
