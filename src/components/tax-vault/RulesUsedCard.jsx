import { BookOpen, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";
import { formatDutchDate } from "@/lib/dateUtils";
import { cn } from "@/lib/utils";

function sourceLabel(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "Bron";
  }
}

/**
 * The tax rules (rates, thresholds, deductions) the backend used, each with its official source.
 * Lets the user and the accountant check where every number comes from.
 */
export function RulesUsedCard({ rules = [], highlightedKey }) {
  return (
    <Card
      id="tax-rules"
      variant="outlined"
      title="Gebruikte regels en bronnen"
      description="Bedragen en percentages uit de database, met de officiële bron"
      icon={<BookOpen className="size-5" />}
      iconColor="primary"
      contentClassName="px-0 pb-0"
    >
      {rules.length === 0 ? (
        <p className="px-5 pb-5 text-xs text-muted-foreground">
          Geen regels ontvangen.
        </p>
      ) : (
        <div className="overflow-x-auto border-t border-border/50">
          <table className="w-full text-xs">
            <thead className="bg-muted/40 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-5 py-2 text-left">Regel</th>
                <th className="px-3 py-2 text-right">Waarde</th>
                <th className="px-3 py-2 text-left">Gecontroleerd</th>
                <th className="px-5 py-2 text-right">Bron</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {rules.map((rule) => (
                <tr
                  key={`${rule.key}-${rule.label}`}
                  id={`rule-${rule.key}`}
                  className={cn(
                    "transition-colors",
                    highlightedKey === rule.key && "bg-primary/10",
                  )}
                >
                  <td className="px-5 py-2 text-foreground">{rule.label}</td>
                  <td className="px-3 py-2 text-right font-mono font-semibold tabular-nums whitespace-nowrap">
                    {rule.display_value}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                    {formatDutchDate(rule.verified_at)}
                  </td>
                  <td className="px-5 py-2 text-right">
                    <a
                      href={rule.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline whitespace-nowrap"
                    >
                      {sourceLabel(rule.source_url)}
                      <ExternalLink className="size-3" />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

export default RulesUsedCard;
