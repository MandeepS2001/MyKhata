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
    } = input;

    const daysUntilPayday = profile.nextPayday
      ? Math.max(0, differenceInDays(parseISO(profile.nextPayday), new Date()))
      : 30;

    let usableCashCents = 0;
    let protectedSavingsCents = 0;
    let creditCardOwedCents = 0;

    for (const account of accounts) {
      if (account.isArchived) continue;

      if (account.accountType === "credit_card") {
        creditCardOwedCents = addCents(
          creditCardOwedCents,
          Math.max(0, -account.currentBalanceCents)
        );
        continue;
      }

      if (account.isProtected) {
        protectedSavingsCents = addCents(
          protectedSavingsCents,
          account.availableBalanceCents
        );
        continue;
      }

      if (account.includedInSafeToSpend) {
        usableCashCents = addCents(
          usableCashCents,
          account.availableBalanceCents
        );
      }
    }

    const bufferMultiplier =
      CAUTION_BUFFER_MULTIPLIER[profile.cautionLevel] ?? 1;
    const safetyBufferCents = Math.round(
      profile.minimumBufferCents * bufferMultiplier
    );

    const breakdown: BreakdownLine[] = [
      { label: "Usable cash", amountCents: usableCashCents, type: "positive" },
    ];

    if (expectedIncomeCents > 0) {
      breakdown.push({
        label: "Expected income before payday",
        amountCents: expectedIncomeCents,
        type: "positive",
      });
    }

    if (creditCardOwedCents > 0) {
      breakdown.push({
        label: "Credit card owed",
        amountCents: -creditCardOwedCents,
        type: "negative",
      });
    }

    if (upcomingBillsCents > 0) {
      breakdown.push({
        label: "Bills before payday",
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
        label: "Expected groceries & fuel",
        amountCents: -expectedEssentialSpendCents,
        type: "negative",
      });
    }

    if (protectedSavingsCents > 0) {
      breakdown.push({
        label: "Protected savings (excluded)",
        amountCents: -protectedSavingsCents,
        type: "neutral",
      });
    }

    if (plannedGoalContributionsCents > 0) {
      breakdown.push({
        label: "Planned goal contributions",
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
      creditCardOwedCents,
      upcomingBillsCents,
      upcomingSubscriptionsCents,
      expectedEssentialSpendCents,
      plannedGoalContributionsCents,
      wishlistReservationsCents,
      safetyBufferCents
    );

    const safeToSpendCents = Math.max(
      0,
      subtractCents(
        addCents(usableCashCents, expectedIncomeCents),
        obligations
      )
    );

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
        "Based on current account balances and detected recurring payments.",
        "Protected savings are excluded unless you override.",
        `Caution level: ${profile.cautionLevel}.`,
      ],
      daysUntilPayday,
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
            ? "Medium confidence because only one month of transactions is available."
            : "Medium confidence because your income is variable.",
      };
    }
    if (accountCount < 2) {
      return {
        confidence: "medium",
        confidenceReason:
          "Medium confidence because only one account is connected.",
      };
    }
    return { confidence: "high" };
  }

  /** Estimate essential spend from recent transaction pace */
  estimateEssentialSpend(
    transactions: Transaction[],
    daysUntilPayday: number
  ): number {
    const essentialCategories = new Set(["groceries", "fuel", "transport"]);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentEssential = transactions.filter(
      (t) =>
        essentialCategories.has(t.category) &&
        t.transactionType === "expense" &&
        new Date(t.transactionDate) >= thirtyDaysAgo
    );

    const totalEssential = recentEssential.reduce(
      (sum, t) => addCents(sum, Math.abs(t.amountCents)),
      0
    );

    const dailyPace = totalEssential / 30;
    return Math.round(dailyPace * daysUntilPayday);
  }
}

export const safeToSpendService = new SafeToSpendService();
