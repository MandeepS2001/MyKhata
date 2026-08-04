import type { Transaction } from "@/domain/models";

export interface MerchantStats {
  merchant: string;
  visitCount: number;
  totalSpentCents: number;
  averageSpendCents: number;
  mostCommonDay: string | null;
  monthlyTrend: Array<{ month: string; amountCents: number }>;
  category: string;
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export class MerchantIntelService {
  summarise(transactions: Transaction[], merchantQuery?: string): MerchantStats[] {
    const debits = transactions.filter((t) => t.direction === "debit");
    const byMerchant = new Map<string, Transaction[]>();

    for (const txn of debits) {
      const key = (txn.normalisedMerchant ?? txn.description).trim();
      if (!key) continue;
      if (
        merchantQuery &&
        !key.toLowerCase().includes(merchantQuery.toLowerCase())
      ) {
        continue;
      }
      const list = byMerchant.get(key) ?? [];
      list.push(txn);
      byMerchant.set(key, list);
    }

    const results: MerchantStats[] = [];

    for (const [merchant, txns] of byMerchant) {
      const total = txns.reduce((s, t) => s + t.amountCents, 0);
      const dayCounts = new Map<number, number>();
      const monthTotals = new Map<string, number>();

      for (const t of txns) {
        const d = new Date(t.transactionDate);
        dayCounts.set(d.getDay(), (dayCounts.get(d.getDay()) ?? 0) + 1);
        const month = t.transactionDate.slice(0, 7);
        monthTotals.set(month, (monthTotals.get(month) ?? 0) + t.amountCents);
      }

      const topDay = [...dayCounts.entries()].sort((a, b) => b[1] - a[1])[0];

      results.push({
        merchant,
        visitCount: txns.length,
        totalSpentCents: total,
        averageSpendCents: Math.round(total / txns.length),
        mostCommonDay: topDay ? DAY_NAMES[topDay[0]] ?? null : null,
        monthlyTrend: [...monthTotals.entries()]
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([month, amountCents]) => ({ month, amountCents })),
        category: txns[0]?.category ?? "other",
      });
    }

    return results.sort((a, b) => b.totalSpentCents - a.totalSpentCents);
  }
}

export const merchantIntelService = new MerchantIntelService();
