import { AppShell } from "@/components/layout/app-shell";
import { createClient } from "@/lib/supabase/server";
import { merchantIntelService } from "@/domain/services/merchant-intel.service";
import { mapTransactionRow } from "@/lib/data/mappers";
import { Card, CardContent } from "@/components/ui/card";
import { formatCents } from "@/lib/currency";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function MerchantsPage() {
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
  const merchants = merchantIntelService.summarise(transactions).slice(0, 30);

  return (
    <AppShell>
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold">Merchants</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Where your money goes most often.
          </p>
        </div>

        {merchants.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-sm text-zinc-400">
              No merchant spend yet. Import transactions to see patterns.
            </CardContent>
          </Card>
        ) : (
          merchants.map((m) => (
            <Link
              key={m.merchant}
              href={`/merchants/${encodeURIComponent(m.merchant)}`}
              className="block"
            >
              <Card className="transition-colors hover:bg-zinc-900/90">
                <CardContent className="flex items-center justify-between gap-3 p-4">
                  <div>
                    <p className="font-medium">{m.merchant}</p>
                    <p className="text-xs text-zinc-500">
                      {m.visitCount} visits · {m.category}
                      {m.mostCommonDay ? ` · often ${m.mostCommonDay}` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-emerald-400">
                      {formatCents(m.totalSpentCents)}
                    </p>
                    <p className="text-xs text-zinc-500">
                      avg {formatCents(m.averageSpendCents)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </AppShell>
  );
}
