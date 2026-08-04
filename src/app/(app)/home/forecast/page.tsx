import { AppShell } from "@/components/layout/app-shell";
import { getDashboardData } from "@/lib/data/dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCents } from "@/lib/currency";
import { cn } from "@/lib/utils";
import { redirect } from "next/navigation";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { TrendingDown } from "lucide-react";

export default async function ForecastPage() {
  const data = await getDashboardData();
  if (!data) redirect("/login");
  if (!data.profile.onboardingCompleted) redirect("/onboarding");

  const { cashFlow } = data;

  return (
    <AppShell>
      <div className="space-y-5">
        <Link
          href="/home"
          className="text-sm text-emerald-400 hover:text-emerald-300"
        >
          ← Back
        </Link>

        <div>
          <h1 className="text-2xl font-bold">Cash flow forecast</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Projected balance over the next {cashFlow.days.length - 1} days,
            including expected income and recurring payments.
          </p>
        </div>

        {cashFlow.firstNegativeReason && (
          <Card className="border-red-500/20 bg-red-950/20">
            <CardContent className="flex gap-3 p-4">
              <TrendingDown className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
              <p className="text-sm text-red-200">{cashFlow.firstNegativeReason}</p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Daily timeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-0 divide-y divide-zinc-800/80">
            {cashFlow.days.map((day) => {
              const hasEvents = day.events.length > 0;
              const isNegative = day.balanceCents < 0;
              const isFirstNegative = day.date === cashFlow.firstNegativeDate;

              return (
                <div
                  key={day.date}
                  className={cn(
                    "flex items-start justify-between gap-3 py-3",
                    isFirstNegative && "bg-red-950/10 -mx-2 px-2 rounded-lg"
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        "text-sm",
                        hasEvents ? "font-medium text-zinc-200" : "text-zinc-500"
                      )}
                    >
                      {format(parseISO(day.date), "EEE d MMM")}
                    </p>
                    {hasEvents ? (
                      <ul className="mt-1 space-y-0.5">
                        {day.events.map((event, i) => (
                          <li
                            key={`${event.label}-${i}`}
                            className="flex justify-between gap-2 text-xs text-zinc-500"
                          >
                            <span className="truncate">{event.label}</span>
                            <span
                              className={cn(
                                "shrink-0 tabular-nums",
                                event.amountCents < 0
                                  ? "text-amber-400"
                                  : "text-emerald-400"
                              )}
                            >
                              {formatCents(event.amountCents, {
                                showSign: true,
                              })}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-0.5 text-xs text-zinc-600">No events</p>
                    )}
                  </div>
                  <span
                    className={cn(
                      "shrink-0 pt-0.5 text-sm font-semibold tabular-nums",
                      isNegative ? "text-red-400" : "text-zinc-200"
                    )}
                  >
                    {formatCents(day.balanceCents)}
                  </span>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <span className="text-sm text-zinc-400">Ending balance</span>
            <span
              className={cn(
                "text-sm font-semibold",
                cashFlow.endBalanceCents < 0
                  ? "text-red-400"
                  : "text-emerald-400"
              )}
            >
              {formatCents(cashFlow.endBalanceCents)}
            </span>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
