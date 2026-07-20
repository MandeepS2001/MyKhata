import { AppShell } from "@/components/layout/app-shell";
import { SafeToSpendHero } from "@/components/dashboard/safe-to-spend-hero";
import { FinancialStatus } from "@/components/dashboard/financial-status";
import { InsightCard } from "@/components/dashboard/insight-card";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { getDashboardData } from "@/lib/data/dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCents } from "@/lib/currency";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const data = await getDashboardData();

  if (!data) {
    redirect("/login");
  }

  if (!data.profile.onboardingCompleted) {
    redirect("/onboarding");
  }

  const accountNames = Object.fromEntries(
    data.accounts.map((a) => [a.id, a.name])
  );

  return (
    <AppShell>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-zinc-400">Good {getGreeting()}</p>
            <h1 className="text-xl font-bold">
              {data.profile.displayName ?? "there"}
            </h1>
          </div>
          {data.profile.isDemo && (
            <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs text-amber-400">
              Demo
            </span>
          )}
        </div>

        <SafeToSpendHero result={data.safeToSpend} />

        <FinancialStatus
          accounts={data.accounts}
          safeToSpendCents={data.safeToSpend.safeToSpendCents}
        />

        {data.insights.map((insight: Record<string, unknown>) => (
          <InsightCard
            key={insight.id as string}
            title={insight.title as string}
            message={insight.message as string}
            severity={insight.severity as "info" | "warning" | "danger" | "positive"}
          />
        ))}

        {data.uncertainCount > 0 && (
          <Link href="/activity/review">
            <Card className="border-amber-500/20 hover:bg-zinc-900/80 transition-colors">
              <CardContent className="p-4">
                <p className="text-sm text-amber-400">
                  {data.totalTransactions} transactions imported.{" "}
                  {data.totalTransactions - data.uncertainCount} understood.{" "}
                  <span className="font-semibold">{data.uncertainCount} need your help.</span>
                </p>
              </CardContent>
            </Card>
          </Link>
        )}

        <RecentActivity
          transactions={data.transactions}
          accountNames={accountNames}
        />

        {data.goals.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Goals</CardTitle>
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
      </div>
    </AppShell>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}
