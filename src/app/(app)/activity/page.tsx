import { AppShell } from "@/components/layout/app-shell";
import { createClient } from "@/lib/supabase/server";
import { formatCents } from "@/lib/currency";
import { mapTransactionRow } from "@/lib/data/mappers";
import { behaviourDisplayLabel } from "@/domain/services/behaviour.service";
import { isRealExpense, isIncomeBehaviour } from "@/domain/services/money-position.service";
import type { Transaction } from "@/domain/models";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ArrowLeftRight } from "lucide-react";
import { redirect } from "next/navigation";
import { format, parseISO } from "date-fns";

export default async function ActivityPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: rows } = await supabase
    .from("transactions")
    .select("*, accounts(name)")
    .eq("user_id", user.id)
    .order("transaction_date", { ascending: false })
    .limit(50);

  const transactions = (rows ?? []).map((row) => ({
    ...mapTransactionRow(row as Record<string, unknown>),
    accountName: ((row as Record<string, unknown>).accounts as { name: string } | null)?.name,
  }));

  const grouped = groupByDate(transactions);

  return (
    <AppShell>
      <div className="space-y-5">
        <div>
          <p className="text-sm font-bold text-[#ffb84d]">Activity</p>
          <h1 className="font-display mt-1 text-3xl font-semibold tracking-tight">
            What’s moving
          </h1>
        </div>

        {Object.keys(grouped).length === 0 ? (
          <Card className="overflow-hidden">
            <CardContent className="space-y-4 p-6 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#ffb84d]/15">
                <span className="font-display text-2xl font-semibold text-[#ffb84d]">
                  +
                </span>
              </div>
              <div>
                <p className="font-display text-xl font-semibold text-[#f7f1e8]">
                  Nothing here yet
                </p>
                <p className="mt-1 text-sm text-[#9a9186]">
                  Tap + and log your first spend, payday, or money move.
                </p>
              </div>
              <a
                href="/activity/add"
                className="inline-flex h-11 items-center justify-center rounded-full bg-[#ffb84d] px-5 text-sm font-bold text-[#1a140c]"
              >
                Add a transaction
              </a>
              <p className="text-xs text-[#6f675e]">
                Prefer demo numbers?{" "}
                <a
                  href="/profile"
                  className="text-[#ffb84d] underline-offset-2 hover:underline"
                >
                  Seed demo from Profile
                </a>
              </p>
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
                  {txns.map((txn) => {
                    const behaviour = txn.behaviour ?? txn.transactionType;
                    const isTransferLike =
                      !isRealExpense(behaviour) && !isIncomeBehaviour(behaviour);
                    const isIncome = isIncomeBehaviour(behaviour);

                    return (
                      <div
                        key={txn.id}
                        className="flex items-center gap-3 px-4 py-3"
                      >
                        {isTransferLike && (
                          <ArrowLeftRight className="h-4 w-4 shrink-0 text-sky-400" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {isTransferLike
                              ? behaviourDisplayLabel(behaviour)
                              : txn.normalisedMerchant ?? txn.description}
                          </p>
                          <p className="text-xs text-zinc-500">
                            {isTransferLike
                              ? txn.description
                              : `${txn.category} · ${txn.accountName ?? "Account"}`}
                          </p>
                        </div>
                        <span
                          className={cn(
                            "ml-3 shrink-0 text-sm font-semibold",
                            isTransferLike
                              ? "text-sky-300"
                              : isIncome
                                ? "text-emerald-400"
                                : "text-zinc-100"
                          )}
                        >
                          {formatCents(
                            txn.direction === "credit" ? txn.amountCents : -txn.amountCents,
                            { showSign: true }
                          )}
                        </span>
                      </div>
                    );
                  })}
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
  transactions: Array<Transaction & { accountName?: string }>
): Record<string, Array<Transaction & { accountName?: string }>> {
  return transactions.reduce<Record<string, Array<Transaction & { accountName?: string }>>>(
    (acc, txn) => {
      const date = txn.transactionDate;
      if (!acc[date]) acc[date] = [];
      acc[date]!.push(txn);
      return acc;
    },
    {}
  );
}
