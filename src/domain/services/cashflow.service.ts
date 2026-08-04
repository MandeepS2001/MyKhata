import type { Account, Transaction } from "@/domain/models";
import { addCents } from "@/lib/currency";
import { addDays, format, parseISO } from "date-fns";
import type { DetectedRecurring } from "@/domain/services/recurring.service";

function signed(amountCents: number, direction: "debit" | "credit"): number {
  return direction === "credit" ? amountCents : -amountCents;
}

export interface CashFlowEvent {
  date: string;
  label: string;
  amountCents: number;
  kind: "income" | "bill" | "subscription" | "transfer" | "other";
}

export interface CashFlowDay {
  date: string;
  balanceCents: number;
  events: CashFlowEvent[];
}

export interface CashFlowForecast {
  days: CashFlowDay[];
  firstNegativeDate: string | null;
  firstNegativeReason: string | null;
  endBalanceCents: number;
}

export class CashFlowForecastService {
  forecast(input: {
    accounts: Account[];
    recurring: DetectedRecurring[];
    expectedIncomeCents: number;
    nextPayday: string | null;
    horizonDays?: number;
  }): CashFlowForecast {
    const horizon = input.horizonDays ?? 45;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let opening = 0;
    for (const account of input.accounts) {
      if (account.isArchived) continue;
      if (account.accountType === "credit_card") continue;
      if (account.isProtected) continue;
      opening = addCents(
        opening,
        account.availableBalanceCents || account.currentBalanceCents
      );
    }

    const eventsByDate = new Map<string, CashFlowEvent[]>();

    const push = (event: CashFlowEvent) => {
      const list = eventsByDate.get(event.date) ?? [];
      list.push(event);
      eventsByDate.set(event.date, list);
    };

    if (input.nextPayday && input.expectedIncomeCents > 0) {
      push({
        date: input.nextPayday,
        label: "Expected salary",
        amountCents: input.expectedIncomeCents,
        kind: "income",
      });
    }

    for (const item of input.recurring) {
      let cursor = parseISO(item.nextExpectedDate);
      const end = addDays(today, horizon);
      let guard = 0;
      while (cursor <= end && guard < 8) {
        if (cursor >= today) {
          push({
            date: format(cursor, "yyyy-MM-dd"),
            label: item.merchant,
            amountCents: -item.typicalAmountCents,
            kind: item.isEssential ? "bill" : "subscription",
          });
        }
        const step =
          item.frequency === "weekly"
            ? 7
            : item.frequency === "fortnightly"
              ? 14
              : item.frequency === "monthly"
                ? 30
                : item.frequency === "quarterly"
                  ? 90
                  : 365;
        cursor = addDays(cursor, step);
        guard++;
      }
    }

    const days: CashFlowDay[] = [];
    let balance = opening;
    let firstNegativeDate: string | null = null;
    let firstNegativeReason: string | null = null;

    for (let i = 0; i <= horizon; i++) {
      const date = format(addDays(today, i), "yyyy-MM-dd");
      const events = eventsByDate.get(date) ?? [];
      for (const event of events) {
        balance = addCents(balance, event.amountCents);
      }
      days.push({ date, balanceCents: balance, events });

      if (balance < 0 && !firstNegativeDate) {
        firstNegativeDate = date;
        firstNegativeReason =
          events.length > 0
            ? `Projected shortfall on ${date} after ${events.map((e) => e.label).join(", ")}.`
            : `Projected shortfall on ${date}.`;
      }
    }

    return {
      days,
      firstNegativeDate,
      firstNegativeReason,
      endBalanceCents: balance,
    };
  }

  openingFromTransactions(transactions: Transaction[]): number {
    return transactions.reduce(
      (sum, t) => sum + signed(t.amountCents, t.direction),
      0
    );
  }
}

export const cashFlowForecastService = new CashFlowForecastService();
