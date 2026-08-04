import { AppShell } from "@/components/layout/app-shell";
import { createClient } from "@/lib/supabase/server";
import { narrateWeeklyReport } from "@/lib/ai/coach";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCents } from "@/lib/currency";
import { subDays, format } from "date-fns";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function WeeklyReportPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("financial_tone")
    .eq("id", user.id)
    .single();

  const since = format(subDays(new Date(), 7), "yyyy-MM-dd");

  const { data: txnRows } = await supabase
    .from("transactions")
    .select("amount_cents, category, direction, transaction_type, transaction_date")
    .eq("user_id", user.id)
    .eq("direction", "debit")
    .gte("transaction_date", since)
    .order("transaction_date", { ascending: false });

  const byCategory = new Map<string, number>();
  let totalSpendCents = 0;

  for (const row of txnRows ?? []) {
    if (row.transaction_type === "internal_transfer") continue;
    const cents = Math.abs(row.amount_cents as number);
    const category = (row.category as string) || "other";
    byCategory.set(category, (byCategory.get(category) ?? 0) + cents);
    totalSpendCents += cents;
  }

  const weekSpendByCategory = [...byCategory.entries()]
    .map(([category, amountCents]) => ({ category, amountCents }))
    .sort((a, b) => b.amountCents - a.amountCents);

  const narrative = await narrateWeeklyReport({
    tone: (profile?.financial_tone as "direct" | "blunt" | "roast") ?? "direct",
    weekSpendByCategory,
    totalSpendCents,
  });

  return (
    <AppShell>
      <div className="space-y-5">
        <Link href="/home" className="text-sm text-emerald-400 hover:text-emerald-300">
          ← Home
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Weekly money leaks</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Last 7 days · since {since}
          </p>
        </div>

        <Card>
          <CardContent className="space-y-3 p-5">
            <p className="text-sm leading-relaxed text-zinc-200">{narrative}</p>
            <p className="text-lg font-semibold text-emerald-400">
              {formatCents(totalSpendCents)} spent
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">By category</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {weekSpendByCategory.length === 0 ? (
              <p className="text-sm text-zinc-500">No debit spend in the last week.</p>
            ) : (
              weekSpendByCategory.map((row) => {
                const pct =
                  totalSpendCents > 0
                    ? Math.round((row.amountCents / totalSpendCents) * 100)
                    : 0;
                return (
                  <div key={row.category}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="capitalize text-zinc-300">{row.category}</span>
                      <span className="text-zinc-400">
                        {formatCents(row.amountCents)} · {pct}%
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-zinc-800">
                      <div
                        className="h-full rounded-full bg-emerald-500/80"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
