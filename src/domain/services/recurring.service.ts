import type { Transaction } from "@/domain/models";
import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns";

export interface DetectedRecurring {
  merchant: string;
  category: string;
  amountCentsMin: number;
  amountCentsMax: number;
  typicalAmountCents: number;
  frequency: "weekly" | "fortnightly" | "monthly" | "quarterly" | "yearly" | "irregular";
  nextExpectedDate: string;
  isEssential: boolean;
  confidence: number;
  occurrenceCount: number;
  lastPaymentDate: string;
  annualCostCents: number;
}

const ESSENTIAL_CATEGORIES = new Set([
  "rent",
  "utilities",
  "insurance",
  "debt_repayment",
]);

function normaliseMerchant(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim().slice(0, 60);
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1]! + sorted[mid]!) / 2)
    : sorted[mid]!;
}

function detectFrequency(
  gaps: number[]
): DetectedRecurring["frequency"] {
  if (gaps.length === 0) return "irregular";
  const avg = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  if (avg >= 5 && avg <= 9) return "weekly";
  if (avg >= 12 && avg <= 16) return "fortnightly";
  if (avg >= 25 && avg <= 35) return "monthly";
  if (avg >= 80 && avg <= 100) return "quarterly";
  if (avg >= 350 && avg <= 380) return "yearly";
  return "irregular";
}

function nextDateFrom(
  lastDate: string,
  frequency: DetectedRecurring["frequency"]
): string {
  const base = parseISO(lastDate);
  const days =
    frequency === "weekly"
      ? 7
      : frequency === "fortnightly"
        ? 14
        : frequency === "monthly"
          ? 30
          : frequency === "quarterly"
            ? 90
            : frequency === "yearly"
              ? 365
              : 30;
  return format(addDays(base, days), "yyyy-MM-dd");
}

function annualMultiplier(frequency: DetectedRecurring["frequency"]): number {
  switch (frequency) {
    case "weekly":
      return 52;
    case "fortnightly":
      return 26;
    case "monthly":
      return 12;
    case "quarterly":
      return 4;
    case "yearly":
      return 1;
    default:
      return 12;
  }
}

export class RecurringPaymentService {
  detect(transactions: Transaction[]): DetectedRecurring[] {
    const debits = transactions.filter(
      (t) => t.direction === "debit" && t.transactionType !== "internal_transfer"
    );

    const byMerchant = new Map<string, Transaction[]>();
    for (const txn of debits) {
      const key = normaliseMerchant(txn.normalisedMerchant ?? txn.description);
      if (!key) continue;
      const list = byMerchant.get(key) ?? [];
      list.push(txn);
      byMerchant.set(key, list);
    }

    const results: DetectedRecurring[] = [];

    for (const [, txns] of byMerchant) {
      if (txns.length < 2) continue;

      const sorted = [...txns].sort((a, b) =>
        a.transactionDate.localeCompare(b.transactionDate)
      );
      const amounts = sorted.map((t) => t.amountCents);
      const amountMin = Math.min(...amounts);
      const amountMax = Math.max(...amounts);
      const spread = amountMax === 0 ? 0 : (amountMax - amountMin) / amountMax;
      if (spread > 0.35 && sorted.length < 4) continue;

      const gaps: number[] = [];
      for (let i = 1; i < sorted.length; i++) {
        gaps.push(
          differenceInCalendarDays(
            parseISO(sorted[i]!.transactionDate),
            parseISO(sorted[i - 1]!.transactionDate)
          )
        );
      }

      const frequency = detectFrequency(gaps);
      if (frequency === "irregular" && sorted.length < 3) continue;

      const typical = median(amounts);
      const last = sorted[sorted.length - 1]!;
      const category = last.category || "subscriptions";
      const isEssential = ESSENTIAL_CATEGORIES.has(category) || last.transactionType === "bill";
      const confidence = Math.min(
        0.95,
        0.45 + sorted.length * 0.1 - spread * 0.2
      );

      results.push({
        merchant: last.normalisedMerchant ?? last.description,
        category,
        amountCentsMin: amountMin,
        amountCentsMax: amountMax,
        typicalAmountCents: typical,
        frequency,
        nextExpectedDate: nextDateFrom(last.transactionDate, frequency),
        isEssential,
        confidence: Number(confidence.toFixed(3)),
        occurrenceCount: sorted.length,
        lastPaymentDate: last.transactionDate,
        annualCostCents: typical * annualMultiplier(frequency),
      });
    }

    return results.sort((a, b) => b.annualCostCents - a.annualCostCents);
  }
}

export const recurringPaymentService = new RecurringPaymentService();
