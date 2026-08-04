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
        <CardContent className="space-y-3 p-6 text-center">
          <p className="font-display text-lg font-semibold text-[#f7f1e8]">
            No activity yet
          </p>
          <p className="text-sm text-[#9a9186]">
            Start with a manual transaction — import is optional.
          </p>
          <Link
            href="/activity/add"
            className="inline-flex h-10 items-center justify-center rounded-full bg-[#ffb84d] px-4 text-sm font-bold text-[#1a140c]"
          >
            Add a transaction
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">Recent activity</CardTitle>
        <Link
          href="/activity"
          className="text-xs font-bold text-[#ffb84d] hover:text-[#ffc56a]"
        >
          See all
        </Link>
      </CardHeader>
      <CardContent className="space-y-1">
        {transactions.map((txn) => (
          <div
            key={txn.id}
            className="flex items-center justify-between rounded-2xl px-2 py-3 hover:bg-black/20"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-[#f7f1e8]">
                {txn.normalisedMerchant ?? txn.description}
              </p>
              <p className="text-xs text-[#9a9186]">
                {txn.category} · {accountNames[txn.accountId] ?? "Account"}
              </p>
            </div>
            <span
              className={`ml-3 text-sm font-bold ${
                txn.direction === "credit" ? "text-[#7dcea0]" : "text-[#f7f1e8]"
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
