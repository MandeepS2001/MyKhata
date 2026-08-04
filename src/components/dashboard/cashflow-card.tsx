import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCents } from "@/lib/currency";
import type { CashFlowForecast } from "@/domain/services/cashflow.service";
import { cn } from "@/lib/utils";
import { TrendingDown } from "lucide-react";
import Link from "next/link";
import { format, parseISO } from "date-fns";

interface CashflowCardProps {
  cashFlow: CashFlowForecast;
}

function pickCompactDays(cashFlow: CashFlowForecast) {
  const picked = cashFlow.days.filter(
    (day, index) => day.events.length > 0 || index % 7 === 0
  );
  return picked.slice(0, 10);
}

export function CashflowCard({ cashFlow }: CashflowCardProps) {
  const days = pickCompactDays(cashFlow);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">Cash flow forecast</CardTitle>
          <Link
            href="/home/forecast"
            className="text-xs text-emerald-400 hover:text-emerald-300"
          >
            Full timeline
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {cashFlow.firstNegativeReason && (
          <div className="flex gap-2 rounded-xl border border-red-500/20 bg-red-950/20 px-3 py-2">
            <TrendingDown className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
            <p className="text-xs text-red-200">{cashFlow.firstNegativeReason}</p>
          </div>
        )}

        <div className="space-y-2">
          {days.map((day) => (
            <div
              key={day.date}
              className="flex items-start justify-between gap-3 text-sm"
            >
              <div className="min-w-0">
                <p className="text-zinc-300">
                  {format(parseISO(day.date), "EEE d MMM")}
                </p>
                {day.events.length > 0 && (
                  <p className="truncate text-xs text-zinc-500">
                    {day.events.map((e) => e.label).join(", ")}
                  </p>
                )}
              </div>
              <span
                className={cn(
                  "shrink-0 font-semibold tabular-nums",
                  day.balanceCents < 0 ? "text-red-400" : "text-zinc-200"
                )}
              >
                {formatCents(day.balanceCents)}
              </span>
            </div>
          ))}
        </div>

        <p className="text-xs text-zinc-500">
          Ending balance:{" "}
          <span
            className={cn(
              "font-medium",
              cashFlow.endBalanceCents < 0 ? "text-red-400" : "text-emerald-400"
            )}
          >
            {formatCents(cashFlow.endBalanceCents)}
          </span>
        </p>
      </CardContent>
    </Card>
  );
}
