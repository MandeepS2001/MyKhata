import { AppShell } from "@/components/layout/app-shell";
import { SafeToSpendHero } from "@/components/dashboard/safe-to-spend-hero";
import { MoneyPositionCard } from "@/components/dashboard/money-position-card";
import { UpcomingBillsCard } from "@/components/dashboard/upcoming-bills-card";
import { AiSummaryCard } from "@/components/dashboard/ai-summary-card";
import { InsightCard } from "@/components/dashboard/insight-card";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { getDashboardData } from "@/lib/data/dashboard";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCents } from "@/lib/currency";
import { cn } from "@/lib/utils";
import { Activity, Settings, TrendingDown } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

function firstNameFrom(
  displayName: string | null | undefined,
  email: string | null | undefined
): string {
  const raw = displayName?.trim();
  if (raw && !/^user$/i.test(raw) && !raw.includes("@")) {
    return raw.split(/\s+/)[0]!;
  }
  if (email) {
    const local = email.split("@")[0] ?? "";
    const part = local.split(/[._+-]/)[0] ?? "";
    if (part) {
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    }
  }
  return "there";
}

export default async function HomePage() {
  const data = await getDashboardData();

  if (!data) {
    redirect("/login");
  }

  if (!data.profile.onboardingCompleted) {
    redirect("/onboarding");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const firstName = firstNameFrom(data.profile.displayName, user?.email);

  const accountNames = Object.fromEntries(
    data.accounts.map((a) => [a.id, a.name])
  );

  const topInsight = data.khataInsights[0];

  return (
    <AppShell>
      <div className="space-y-5">
        <div className="mk-rise flex items-end justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-[#ffb84d]">MyKhata</p>
            <h1 className="font-display mt-1 text-3xl font-semibold tracking-tight text-[#f7f1e8]">
              Hey, {firstName}
            </h1>
          </div>
          <div className="flex items-center gap-2 pb-1">
            {data.profile.isDemo && (
              <span className="rounded-full bg-[#ffb84d]/15 px-3 py-1 text-xs font-bold text-[#ffb84d]">
                Demo
              </span>
            )}
            <Link
              href="/profile"
              aria-label="Settings"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-[#f7f1e8] hover:bg-white/10"
            >
              <Settings className="h-5 w-5" />
            </Link>
          </div>
        </div>

        <SafeToSpendHero
          result={data.safeToSpend}
          totalCashCents={data.totalCashCents}
        />

        <MoneyPositionCard moneyPosition={data.moneyPosition} />

        <UpcomingBillsCard items={data.upcomingRecurring} />

        <AiSummaryCard summary={data.aiSummary} />

        {topInsight && (
          <InsightCard
            title={topInsight.title}
            message={topInsight.message}
            severity={topInsight.severity}
          />
        )}

        {data.uncertainCount > 0 && (
          <Link href="/activity/review">
            <Card className="border-amber-500/20 transition-colors hover:bg-zinc-900/80">
              <CardContent className="p-4">
                <p className="text-sm text-amber-400">
                  {data.totalTransactions} transactions imported.{" "}
                  {data.totalTransactions - data.uncertainCount} understood.{" "}
                  <span className="font-semibold">
                    {data.uncertainCount} need your help.
                  </span>
                </p>
              </CardContent>
            </Card>
          </Link>
        )}

        {data.goals.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">Goals</CardTitle>
              <Link href="/goals" className="text-xs text-emerald-400 hover:text-emerald-300">
                See all
              </Link>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.goals.map((goal: Record<string, unknown>) => {
                const progress =
                  ((goal.current_amount_cents as number) /
                    (goal.target_amount_cents as number)) *
                  100;
                return (
                  <div key={goal.id as string}>
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-300">{goal.name as string}</span>
                      <span className="text-zinc-500">
                        {formatCents(goal.current_amount_cents as number)} /{" "}
                        {formatCents(goal.target_amount_cents as number)}
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 rounded-full bg-zinc-800">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all"
                        style={{ width: `${Math.min(progress, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        <RecentActivity
          transactions={data.transactions}
          accountNames={accountNames}
        />

        <Link href="/plan">
          <Card className="border-zinc-800/60 bg-zinc-900/40 transition-colors hover:bg-zinc-900/70">
            <CardContent className="flex items-center justify-between gap-3 p-4">
              <div className="flex items-center gap-3">
                <Activity className="h-4 w-4 text-zinc-500" />
                <div>
                  <p className="text-sm text-zinc-300">
                    Health score: <span className="font-medium">{data.healthScore.grade}</span>
                  </p>
                  <p className="text-xs text-zinc-500">
                    Forecast ending balance{" "}
                    <span
                      className={cn(
                        data.cashFlow.endBalanceCents < 0
                          ? "text-red-400"
                          : "text-zinc-400"
                      )}
                    >
                      {formatCents(data.cashFlow.endBalanceCents)}
                    </span>
                  </p>
                </div>
              </div>
              {data.cashFlow.firstNegativeReason && (
                <TrendingDown className="h-4 w-4 shrink-0 text-red-400" />
              )}
            </CardContent>
          </Card>
        </Link>
      </div>
    </AppShell>
  );
}
