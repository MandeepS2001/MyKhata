import { formatCents } from "@/lib/currency";
import type { Transaction } from "@/domain/models";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

interface RecentActivityProps {
  transactions: Transaction[];
  accountNames: Record<string, string>;
}

export function RecentActivity({ transactions, accountNames }: RecentActivityProps) {
  if (transactions.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-sm text-zinc-400">
            Your Khata is empty. Import a statement or try demo mode.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">Recent activity</CardTitle>
        <Link href="/activity" className="text-xs text-emerald-400 hover:text-emerald-300">
          See all
        </Link>
      </CardHeader>
      <CardContent className="space-y-1">
        {transactions.map((txn) => (
          <div
            key={txn.id}
            className="flex items-center justify-between rounded-xl px-2 py-3 hover:bg-zinc-800/50"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-zinc-100">
                {txn.normalisedMerchant ?? txn.description}
              </p>
              <p className="text-xs text-zinc-500">
                {txn.category} · {accountNames[txn.accountId] ?? "Account"}
              </p>
            </div>
            <span
              className={`ml-3 text-sm font-semibold ${
                txn.direction === "credit" ? "text-emerald-400" : "text-zinc-100"
              }`}
            >
              {formatCents(
                txn.direction === "credit" ? txn.amountCents : -txn.amountCents,
                { showSign: true }
              )}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
