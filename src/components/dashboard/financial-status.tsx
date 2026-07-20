import { formatCents } from "@/lib/currency";
import type { Account } from "@/domain/models";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface FinancialStatusProps {
  accounts: Account[];
  safeToSpendCents: number;
  upcomingBillsCents?: number;
}

export function FinancialStatus({
  accounts,
  safeToSpendCents,
  upcomingBillsCents = 0,
}: FinancialStatusProps) {
  let totalCash = 0;
  let protectedSavings = 0;
  let creditCardDebt = 0;

  for (const account of accounts) {
    if (account.accountType === "credit_card") {
      creditCardDebt += Math.max(0, -account.currentBalanceCents);
    } else if (account.isProtected) {
      protectedSavings += account.currentBalanceCents;
    } else {
      totalCash += account.currentBalanceCents;
    }
  }

  const items = [
    { label: "Total cash", value: totalCash, color: "text-zinc-100" },
    { label: "Protected savings", value: protectedSavings, color: "text-emerald-400" },
    { label: "Credit card debt", value: -creditCardDebt, color: "text-red-400" },
    { label: "Upcoming bills", value: -upcomingBillsCents, color: "text-amber-400" },
    { label: "Safe to spend", value: safeToSpendCents, color: "text-emerald-400" },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Financial status</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => (
          <div key={item.label} className="flex items-center justify-between">
            <span className="text-sm text-zinc-400">{item.label}</span>
            <span className={`text-sm font-semibold ${item.color}`}>
              {formatCents(item.value, { showSign: item.value < 0 })}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
