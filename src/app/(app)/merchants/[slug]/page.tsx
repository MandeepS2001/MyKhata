import { AppShell } from "@/components/layout/app-shell";
import { createClient } from "@/lib/supabase/server";
import { merchantIntelService } from "@/domain/services/merchant-intel.service";
import { mapTransactionRow } from "@/lib/data/mappers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCents } from "@/lib/currency";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";

export default async function MerchantDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const merchantName = decodeURIComponent(slug);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: txnRows } = await supabase
    .from("transactions")
    .select("*")
    .eq("user_id", user.id)
    .order("transaction_date", { ascending: false })
    .limit(500);

  const transactions = (txnRows ?? []).map(mapTransactionRow);
  const stats = merchantIntelService
    .summarise(transactions, merchantName)
    .find(
      (m) => m.merchant.toLowerCase() === merchantName.toLowerCase()
    );

  if (!stats) notFound();

  const merchantTxns = transactions
    .filter((t) => {
      const key = (t.normalisedMerchant ?? t.description).trim();
      return key.toLowerCase() === merchantName.toLowerCase();
    })
    .slice(0, 20);

  return (
    <AppShell>
      <div className="space-y-5">
        <Link
          href="/merchants"
          className="text-sm text-emerald-400 hover:text-emerald-300"
        >
          ← Merchants
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{stats.merchant}</h1>
          <p className="mt-1 text-sm capitalize text-zinc-400">
            {stats.category}
          </p>
        </div>

        <Card>
          <CardContent className="grid grid-cols-2 gap-4 p-5">
            <div>
              <p className="text-xs text-zinc-500">Total spent</p>
              <p className="text-lg font-semibold text-emerald-400">
                {formatCents(stats.totalSpentCents)}
              </p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Average</p>
              <p className="text-lg font-semibold">
                {formatCents(stats.averageSpendCents)}
              </p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Visits</p>
              <p className="text-lg font-semibold">{stats.visitCount}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Most common day</p>
              <p className="text-lg font-semibold">
                {stats.mostCommonDay ?? "—"}
              </p>
            </div>
          </CardContent>
        </Card>

        {stats.monthlyTrend.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Monthly trend</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {stats.monthlyTrend.map((row) => (
                <div
                  key={row.month}
                  className="flex justify-between text-sm"
                >
                  <span className="text-zinc-400">{row.month}</span>
                  <span>{formatCents(row.amountCents)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Recent transactions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {merchantTxns.length === 0 ? (
              <p className="text-sm text-zinc-500">No transactions found.</p>
            ) : (
              merchantTxns.map((t) => (
                <div
                  key={t.id}
                  className="flex justify-between gap-3 text-sm"
                >
                  <div>
                    <p className="text-zinc-200">{t.description}</p>
                    <p className="text-xs text-zinc-500">{t.transactionDate}</p>
                  </div>
                  <p className="shrink-0 font-medium text-zinc-300">
                    {formatCents(t.amountCents)}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
