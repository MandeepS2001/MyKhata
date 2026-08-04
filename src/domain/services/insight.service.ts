import type { Transaction } from "@/domain/models";

export interface StructuredInsight {
  insightType: string;
  title: string;
  message: string;
  severity: "info" | "warning" | "danger" | "positive";
  suggestedAction?: string;
  evidence?: Record<string, unknown>;
}

export class InsightService {
  generate(transactions: Transaction[]): StructuredInsight[] {
    const insights: StructuredInsight[] = [];
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const recent = transactions.filter(
      (t) => t.direction === "debit" && new Date(t.transactionDate) >= thirtyDaysAgo
    );
    const previous = transactions.filter(
      (t) =>
        t.direction === "debit" &&
        new Date(t.transactionDate) >= sixtyDaysAgo &&
        new Date(t.transactionDate) < thirtyDaysAgo
    );

    const sumCat = (list: Transaction[], category: string) =>
      list.filter((t) => t.category === category).reduce((s, t) => s + t.amountCents, 0);

    const takeaway = sumCat(recent, "takeaway");
    const groceries = sumCat(recent, "groceries");
    if (takeaway > groceries && takeaway > 5000) {
      insights.push({
        insightType: "takeaway_vs_groceries",
        title: "Takeaway is outpacing groceries",
        message: `You spent more on takeaway than groceries in the last 30 days. That pattern usually means food costs more than it needs to.`,
        severity: "warning",
        suggestedAction: "Swap one takeaway night for a home meal this week.",
        evidence: { takeaway, groceries },
      });
    }

    const shoppingNow = sumCat(recent, "shopping");
    const shoppingPrev = sumCat(previous, "shopping");
    if (shoppingPrev > 0 && shoppingNow > shoppingPrev * 1.2) {
      const pct = Math.round(((shoppingNow - shoppingPrev) / shoppingPrev) * 100);
      insights.push({
        insightType: "shopping_increase",
        title: "Shopping is up",
        message: `Shopping is about ${pct}% higher than the previous month.`,
        severity: "info",
        suggestedAction: "Pause non-essential shopping until after payday.",
        evidence: { shoppingNow, shoppingPrev, pct },
      });
    }

    const subs = sumCat(recent, "subscriptions");
    if (subs > 0) {
      insights.push({
        insightType: "subscription_load",
        title: "Subscriptions add up",
        message: `Subscriptions cost about $${(subs / 100).toFixed(0)} this month — roughly $${((subs * 12) / 100).toFixed(0)} a year at this pace.`,
        severity: "info",
        suggestedAction: "Open Subscriptions and cancel anything you have not used lately.",
        evidence: { monthly: subs, annual: subs * 12 },
      });
    }

    const byDay = new Map<number, number>();
    for (const t of recent) {
      const day = new Date(t.transactionDate).getDay();
      byDay.set(day, (byDay.get(day) ?? 0) + t.amountCents);
    }
    const peak = [...byDay.entries()].sort((a, b) => b[1] - a[1])[0];
    if (peak && peak[1] > 0) {
      const names = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      insights.push({
        insightType: "peak_spend_day",
        title: `${names[peak[0]]} is your peak spend day`,
        message: `Most of your recent spending lands on ${names[peak[0]]}. Knowing the pattern helps you plan around it.`,
        severity: "info",
        evidence: { day: peak[0], amount: peak[1] },
      });
    }

    return insights.slice(0, 5);
  }
}

export const insightService = new InsightService();
