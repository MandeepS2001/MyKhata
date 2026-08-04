import { addCents, subtractCents } from "@/lib/currency";
import type {
  Account,
  BreakdownLine,
  CautionLevel,
  ConfidenceLevel,
  Profile,
  SafeToSpendResult,
  Transaction,
} from "@/domain/models";
import {
  calculateBreathingRoom,
  calculateMoneyPosition,
  isRealExpense,
} from "@/domain/services/money-position.service";
import { differenceInDays, parseISO } from "date-fns";

export interface SafeToSpendInput {
  profile: Profile;
  accounts: Account[];
  upcomingBillsCents: number;
  upcomingSubscriptionsCents: number;
  expectedEssentialSpendCents: number;
  plannedGoalContributionsCents: number;
  wishlistReservationsCents: number;
  expectedIncomeCents: number;
  transactionHistoryMonths: number;
  includeGeneralSavings?: boolean;
  creditCardPaymentDueCents?: number;
  spendingVelocityPct?: number;
}

const CAUTION_BUFFER_MULTIPLIER: Record<CautionLevel, number> = {
  relaxed: 0.5,
  balanced: 1,
  conservative: 1.5,
};

export class SafeToSpendService {
  calculate(input: SafeToSpendInput): SafeToSpendResult {
    const {
      profile,
      accounts,
      upcomingBillsCents,
      upcomingSubscriptionsCents,
      expectedEssentialSpendCents,
      plannedGoalContributionsCents,
      wishlistReservationsCents,
      expectedIncomeCents,
      transactionHistoryMonths,
      includeGeneralSavings = false,
      creditCardPaymentDueCents = 0,
      spendingVelocityPct = 0,
    } = input;

    const daysUntilPayday = profile.nextPayday
      ? Math.max(0, differenceInDays(parseISO(profile.nextPayday), new Date()))
      : 30;

    const position = calculateMoneyPosition(accounts, {
      includeGeneralSavingsInSpendable: includeGeneralSavings,
    });

    const usableCashCents = position.spendableCashCents;
    const ccPayment = creditCardPaymentDueCents;

    const bufferMultiplier =
      CAUTION_BUFFER_MULTIPLIER[profile.cautionLevel] ?? 1;
    const safetyBufferCents = Math.round(
      profile.minimumBufferCents * bufferMultiplier
    );

    const breakdown: BreakdownLine[] = [
      {
        label: "Available cash",
        amountCents: usableCashCents,
        type: "positive",
      },
    ];

    if (expectedIncomeCents > 0) {
      breakdown.push({
        label: "Expected income before payday",
        amountCents: expectedIncomeCents,
        type: "positive",
      });
    }

    if (upcomingBillsCents > 0) {
      breakdown.push({
        label: "Upcoming bills",
        amountCents: -upcomingBillsCents,
        type: "negative",
      });
    }

    if (upcomingSubscriptionsCents > 0) {
      breakdown.push({
        label: "Subscriptions before payday",
        amountCents: -upcomingSubscriptionsCents,
        type: "negative",
      });
    }

    if (expectedEssentialSpendCents > 0) {
      breakdown.push({
        label: "Expected essentials (food + fuel)",
        amountCents: -expectedEssentialSpendCents,
        type: "negative",
      });
    }

    if (ccPayment > 0) {
      breakdown.push({
        label: "Credit card payment due",
        amountCents: -ccPayment,
        type: "negative",
      });
    }

    if (position.protectedSavingsCents > 0) {
      breakdown.push({
        label: "Protected savings (excluded)",
        amountCents: position.protectedSavingsCents,
        type: "neutral",
      });
    }

    if (plannedGoalContributionsCents > 0) {
      breakdown.push({
        label: "Planned savings contributions",
        amountCents: -plannedGoalContributionsCents,
        type: "negative",
      });
    }

    if (wishlistReservationsCents > 0) {
      breakdown.push({
        label: "Wishlist reservations",
        amountCents: -wishlistReservationsCents,
        type: "negative",
      });
    }

    breakdown.push({
      label: "Safety buffer",
      amountCents: -safetyBufferCents,
      type: "negative",
    });

    const obligations = addCents(
      upcomingBillsCents,
      upcomingSubscriptionsCents,
      expectedEssentialSpendCents,
      ccPayment,
      plannedGoalContributionsCents,
      wishlistReservationsCents,
      safetyBufferCents
    );

    const safeToSpendCents = Math.max(
      0,
      subtractCents(addCents(usableCashCents, expectedIncomeCents), obligations)
    );

    const billsCovered =
      addCents(usableCashCents, expectedIncomeCents) >=
      addCents(upcomingBillsCents, upcomingSubscriptionsCents, ccPayment);

    const dailyPaceCents =
      daysUntilPayday > 0 ? Math.round(safeToSpendCents / daysUntilPayday) : 0;

    const breathing = calculateBreathingRoom({
      safeToSpendCents,
      daysUntilPayday,
      billsCovered,
      spendingVelocityPct,
    });

    const { confidence, confidenceReason } = this.assessConfidence(
      transactionHistoryMonths,
      profile.incomeType,
      accounts.length
    );

    return {
      safeToSpendCents,
      confidence,
      confidenceReason,
      breakdown,
      assumptions: [
        "Based on spendable cash (everyday + wallet), not net worth.",
        "Protected savings are never treated as free cash.",
        "Credit card available limit is never treated as wealth.",
        `Caution level: ${profile.cautionLevel}.`,
      ],
      daysUntilPayday,
      billsCovered,
      savingsProtected: true,
      dailyPaceCents,
      breathingRoom: breathing.status,
      breathingRoomReason: breathing.reason,
    };
  }

  private assessConfidence(
    historyMonths: number,
    incomeType: string,
    accountCount: number
  ): { confidence: ConfidenceLevel; confidenceReason?: string } {
    if (historyMonths < 1) {
      return {
        confidence: "low",
        confidenceReason:
          "Low confidence because less than one month of transactions is available.",
      };
    }
    if (historyMonths < 2 || incomeType === "variable") {
      return {
        confidence: "medium",
        confidenceReason:
          historyMonths < 2
            ? "Medium confidence — only one month of history."
            : "Medium confidence — variable income.",
      };
    }
    if (accountCount < 2) {
      return {
        confidence: "medium",
        confidenceReason: "Medium confidence — only one account on file.",
      };
    }
    return { confidence: "high" };
  }

  estimateEssentialSpend(
    transactions: Transaction[],
    daysUntilPayday: number
  ): number {
    const essentialCategories = new Set([
      "groceries",
      "fuel",
      "transport",
      "dining",
      "takeaway",
    ]);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentEssential = transactions.filter((t) => {
      const behaviour = t.behaviour ?? t.transactionType;
      return (
        essentialCategories.has(t.category) &&
        isRealExpense(behaviour) &&
        new Date(t.transactionDate) >= thirtyDaysAgo
      );
    });

    const totalEssential = recentEssential.reduce(
      (sum, t) => addCents(sum, Math.abs(t.amountCents)),
      0
    );

    const dailyPace = totalEssential / 30;
    return Math.round(dailyPace * daysUntilPayday);
  }
}

export const safeToSpendService = new SafeToSpendService();
