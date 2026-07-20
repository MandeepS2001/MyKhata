import { AppShell } from "@/components/layout/app-shell";
import { createClient } from "@/lib/supabase/server";
import { formatCents } from "@/lib/currency";
import { Card, CardContent } from "@/components/ui/card";
import { redirect } from "next/navigation";
import { format, parseISO } from "date-fns";

export default async function ActivityPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: transactions } = await supabase
    .from("transactions")
    .select("*, accounts(name)")
    .eq("user_id", user.id)
    .order("transaction_date", { ascending: false })
    .limit(50);

  const grouped = groupByDate(transactions ?? []);

  return (
    <AppShell>
      <div className="space-y-5">
        <h1 className="text-2xl font-bold">Activity</h1>

        {Object.keys(grouped).length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-sm text-zinc-400">
              Your Khata is empty. Import a statement or try demo mode.
            </CardContent>
          </Card>
        ) : (
          Object.entries(grouped).map(([date, txns]) => (
            <div key={date}>
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
                {format(parseISO(date), "EEEE, d MMMM")}
              </p>
              <Card>
                <CardContent className="divide-y divide-zinc-800 p-0">
                  {txns.map((txn: Record<string, unknown>) => (
                    <div key={txn.id as string} className="flex items-center justify-between px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {(txn.normalised_merchant as string) ?? (txn.description as string)}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {txn.category as string} ·{" "}
                          {(txn.accounts as { name: string })?.name}
                        </p>
                      </div>
                      <span
                        className={`ml-3 text-sm font-semibold ${
                          txn.direction === "credit" ? "text-emerald-400" : "text-zinc-100"
                        }`}
                      >
                        {formatCents(
                          txn.direction === "credit"
                            ? (txn.amount_cents as number)
                            : -(txn.amount_cents as number),
                          { showSign: true }
                        )}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          ))
        )}
      </div>
    </AppShell>
  );
}

function groupByDate(
  transactions: Array<Record<string, unknown>>
): Record<string, Array<Record<string, unknown>>> {
  return transactions.reduce<Record<string, Array<Record<string, unknown>>>>(
    (acc, txn) => {
      const date = txn.transaction_date as string;
      if (!acc[date]) acc[date] = [];
      acc[date]!.push(txn);
      return acc;
    },
    {}
  );
}
