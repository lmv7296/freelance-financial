import { Download, FileArchive, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { resolveApiUrl } from "@/lib/api/client";
import { formatDate } from "@/lib/dateUtils";
import { useT } from "@/lib/preferences/PreferencesContext";

/**
 * History of exports made for the accountant
 */
export function ExportsCard({
  exports,
  error,
  formatLabels = {},
  onNewExport,
}) {
  const t = useT();
  return (
    <Card
      variant="outlined"
      title={t("taxVault.exports.title")}
      description={t("taxVault.exports.description")}
      icon={<FileArchive className="size-5" />}
      iconColor="emerald"
      headerAction={
        <Button
          size="xs"
          variant="outline"
          onClick={onNewExport}
          className="rounded-full"
        >
          {t("taxVault.exports.new")}
        </Button>
      }
    >
      {error ? (
        <p className="text-xs text-muted-foreground">{error}</p>
      ) : !exports ? (
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
      ) : exports.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          {t("taxVault.exports.empty")}
        </p>
      ) : (
        <ul className="divide-y divide-border/40">
          {exports.map((item) => (
            <li key={item.id} className="flex items-center gap-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-foreground">
                  {item.period_label}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {formatDate(item.created_at)} •{" "}
                  {item.formats.map((f) => formatLabels[f] || f).join(", ")}
                </p>
                {item.sent_to && (
                  <p className="text-[10px] text-emerald-700 dark:text-emerald-400">
                    <Mail className="mr-1 inline size-3" />
                    {t("taxVault.exports.sentTo", { email: item.sent_to })}
                  </p>
                )}
                {item.status === "failed" && (
                  <p className="text-[10px] text-destructive">
                    {item.error || t("taxVault.exports.failed")}
                  </p>
                )}
              </div>
              {item.status === "pending" && (
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Loader2 className="size-3.5 animate-spin" />
                  {t("taxVault.exports.busy")}
                </span>
              )}
              {item.status === "ready" && item.download_url && (
                <a
                  href={resolveApiUrl(item.download_url)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border/70 px-3 py-1 text-[11px] font-semibold text-foreground hover:bg-muted transition-colors"
                >
                  <Download className="size-3.5" />
                  {t("taxVault.exports.download")}
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export default ExportsCard;
