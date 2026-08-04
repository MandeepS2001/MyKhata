import type { Account, Profile, Transaction } from "@/domain/models";
import type { DetectedRecurring } from "@/domain/services/recurring.service";

export interface HealthScoreResult {
  score: number;
  grade: string;
  strength: string;
  weakness: string;
  suggestion: string;
  factors: Array<{ label: string; score: number; weight: number }>;
}

function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, n));
}

function gradeFromScore(score: number): string {
  if (score >= 90) return "Excellent";
  if (score >= 80) return "Very Good";
  if (score >= 70) return "Good";
  if (score >= 55) return "Fair";
  if (score >= 40) return "Needs work";
  return "At risk";
}

export class HealthScoreService {
  calculate(input: {
    profile: Profile;
    accounts: Account[];
    transactions: Transaction[];
    recurring: DetectedRecurring[];
    safeToSpendCents: number;
  }): HealthScoreResult {
    const { accounts, transactions, recurring, safeToSpendCents, profile } = input;

    let cash = 0;
    let debt = 0;
    for (const a of accounts) {
      if (a.isArchived) continue;
      if (a.accountType === "credit_card") {
        debt += Math.max(0, -a.currentBalanceCents);
      } else {
        cash += Math.max(0, a.currentBalanceCents);
      }
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recent = transactions.filter(
      (t) => new Date(t.transactionDate) >= thirtyDaysAgo
    );
    const income = recent
      .filter((t) => t.direction === "credit" && t.category === "income")
      .reduce((s, t) => s + t.amountCents, 0);
    const spend = recent
      .filter((t) => t.direction === "debit" && t.category !== "transfer")
      .reduce((s, t) => s + t.amountCents, 0);
    const savingsRate = income > 0 ? (income - spend) / income : 0;

    const takeaway = recent
      .filter((t) => t.category === "takeaway" || t.category === "dining")
      .reduce((s, t) => s + t.amountCents, 0);
    const groceries = recent
      .filter((t) => t.category === "groceries")
      .reduce((s, t) => s + t.amountCents, 0);
    const subAnnual = recurring
      .filter((r) => !r.isEssential)
      .reduce((s, r) => s + r.annualCostCents, 0);

    const cashFlowScore = clamp(
      safeToSpendCents <= 0 ? 25 : 55 + Math.min(45, safeToSpendCents / 2000)
    );
    const savingsScore = clamp(50 + savingsRate * 80);
    const debtScore =
      cash <= 0 ? (debt > 0 ? 35 : 60) : clamp(90 - (debt / Math.max(cash, 1)) * 80);
    const emergencyScore = clamp((cash / Math.max(profile.minimumBufferCents, 1)) * 70);
    const foodScore =
      groceries + takeaway === 0
        ? 70
        : clamp(90 - (takeaway / Math.max(groceries + takeaway, 1)) * 80);
    const subScore = clamp(95 - subAnnual / 4000);
    const incomeScore =
      profile.incomeType === "salary" || profile.incomeType === "hourly" ? 85 : 55;

    const factors = [
      { label: "Cash flow", score: cashFlowScore, weight: 0.2 },
      { label: "Savings rate", score: savingsScore, weight: 0.15 },
      { label: "Debt", score: debtScore, weight: 0.15 },
      { label: "Emergency fund", score: emergencyScore, weight: 0.15 },
      { label: "Food spending", score: foodScore, weight: 0.1 },
      { label: "Subscriptions", score: subScore, weight: 0.1 },
      { label: "Income stability", score: incomeScore, weight: 0.15 },
    ];

    const score = Math.round(
      factors.reduce((s, f) => s + f.score * f.weight, 0)
    );

    const sorted = [...factors].sort((a, b) => b.score - a.score);
    const strength = sorted[0]!;
    const weakness = sorted[sorted.length - 1]!;

    const suggestion =
      weakness.label === "Food spending"
        ? "Cut one takeaway meal each week and redirect it to savings."
        : weakness.label === "Subscriptions"
          ? "Review unused subscriptions — annual costs add up quietly."
          : weakness.label === "Debt"
            ? "Prioritise credit card repayment before discretionary spending."
            : weakness.label === "Emergency fund"
              ? "Build toward your minimum buffer before new wishlist buys."
              : "Keep focusing on cash flow until safe-to-spend is consistently positive.";

    return {
      score,
      grade: gradeFromScore(score),
      strength: strength.label,
      weakness: weakness.label,
      suggestion,
      factors,
    };
  }
}

export const healthScoreService = new HealthScoreService();
