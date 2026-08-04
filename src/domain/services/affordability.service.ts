import type {
  Account,
  AffordabilityResult,
  AffordabilityVerdict,
  ConfidenceLevel,
  Goal,
  Profile,
  SafeToSpendResult,
} from "@/domain/models";
import { calculateMoneyPosition } from "@/domain/services/money-position.service";
import { addCents, centsToWorkHours, subtractCents } from "@/lib/currency";
import { addDays, format } from "date-fns";

export type AffordabilityTone = "green" | "amber" | "red";

export interface AffordabilityImpact {
  before: {
    safeToSpendCents: number;
    everydayCents: number;
    creditCardOwedCents: number;
    savingsCents: number;
  };
  after: {
    safeToSpendCents: number;
    everydayCents: number;
    creditCardOwedCents: number;
    savingsCents: number;
    billsCovered: boolean;
    protectedSavingsTouched: boolean;
    safetyBufferMaintained: boolean;
  };
}

export interface EnhancedAffordabilityResult extends AffordabilityResult {
  tone: AffordabilityTone;
  headline: string;
  cardCanPayButFinancesCant: boolean;
  impact: AffordabilityImpact;
  suggestedWeeklySaveCents: number | null;
  daysToAfford: number | null;
}

export interface AffordabilityInput {
  itemPriceCents: number;
  savedAmountCents: number;
  safeToSpend: SafeToSpendResult;
  profile: Profile;
  goals: Goal[];
  accounts: Account[];
  upcomingBillsCents: number;
  allowProtectedSavings: boolean;
  paymentMethod?: "cash" | "credit_card";
  ongoingMonthlyCostCents: number;
  targetDate?: string | null;
  includeGeneralSavings?: boolean;
}

export class AffordabilityService {
  calculate(input: AffordabilityInput): EnhancedAffordabilityResult {
    const {
      itemPriceCents,
      savedAmountCents,
      safeToSpend,
      profile,
      goals,
      accounts,
      allowProtectedSavings,
      paymentMethod = "cash",
      ongoingMonthlyCostCents,
      includeGeneralSavings = false,
    } = input;

    const position = calculateMoneyPosition(accounts, {
      includeGeneralSavingsInSpendable: includeGeneralSavings,
    });

    const netPriceCents = Math.max(
      0,
      subtractCents(itemPriceCents, savedAmountCents)
    );

    const afterTaxHourly =
      profile.hourlyRateCents && profile.estimatedTaxRate
        ? Math.round(
            profile.hourlyRateCents * (1 - (profile.estimatedTaxRate ?? 0) / 100)
          )
        : null;

    const workHoursCost =
      afterTaxHourly && profile.showWorkHours
        ? centsToWorkHours(netPriceCents, afterTaxHourly)
        : null;

    const freeCash = safeToSpend.safeToSpendCents;
    const availableCredit = Math.max(
      0,
      ...accounts
        .filter((a) => a.accountType === "credit_card" && a.creditLimitCents)
        .map((a) =>
          Math.max(
            0,
            (a.creditLimitCents ?? 0) - Math.max(0, -a.currentBalanceCents)
          )
        )
    );

    const cardCanProcess =
      paymentMethod === "credit_card" && availableCredit >= netPriceCents;

    const cashAfter = subtractCents(freeCash, netPriceCents);
    const bufferFloor = profile.minimumBufferCents;
    const safetyBufferMaintained = cashAfter >= bufferFloor;
    const billsCovered = cashAfter >= 0;

    let protectedSavingsUsed = 0;
    if (cashAfter < 0 && allowProtectedSavings) {
      protectedSavingsUsed = Math.min(
        position.protectedSavingsCents,
        Math.abs(cashAfter)
      );
    }

    const goalDelays = this.calculateGoalDelays(goals, netPriceCents, profile);

    let verdict: AffordabilityVerdict;
    let explanation: string;
    let suggestedAction: string;
    let score: number;
    let tone: AffordabilityTone;
    let headline: string;

    const cardCanPayButFinancesCant =
      cardCanProcess && freeCash < netPriceCents && protectedSavingsUsed === 0;

    if (cardCanPayButFinancesCant) {
      verdict = "no";
      tone = "red";
      headline = "Your card can pay for it. Your finances can’t.";
      explanation = `Available credit could process ${formatDollars(netPriceCents)}, but you only have ${formatDollars(freeCash)} genuinely free until payday.`;
      suggestedAction = "Don’t use the card to paper over a shortfall.";
      score = 18;
    } else if (freeCash <= 0 && netPriceCents > 0) {
      verdict = "absolutely_not";
      tone = "red";
      headline = "Not safely affordable";
      explanation =
        "You’re already projected to run short before payday. This purchase would make it worse.";
      suggestedAction = "Do not buy this right now.";
      score = 10;
    } else if (
      netPriceCents > freeCash &&
      allowProtectedSavings &&
      netPriceCents <= addCents(freeCash, position.protectedSavingsCents)
    ) {
      verdict = "protected_savings_required";
      tone = "red";
      headline = "Not safely affordable";
      explanation =
        "You have enough money overall, but buying this now would require touching protected savings.";
      suggestedAction = "Leave protected savings alone.";
      score = 30;
    } else if (netPriceCents > freeCash) {
      verdict = "no";
      tone = "red";
      headline = "Not safely affordable";
      explanation = `Buying this would leave you short for upcoming bills and essentials.`;
      suggestedAction = "Wait until after your next payday.";
      score = 22;
    } else if (!safetyBufferMaintained || cashAfter < bufferFloor * 1.5) {
      verdict = "technically_yes";
      tone = "amber";
      headline = "Technically affordable";
      explanation = `You can buy it, but you’d only have ${formatDollars(Math.max(0, cashAfter))} of genuinely free cash left until payday.`;
      suggestedAction = "You can buy it. But I wouldn’t yet.";
      score = 55;
    } else if (goalDelays.some((g) => g.delayDays > 14)) {
      verdict = "technically_yes";
      tone = "amber";
      headline = "Technically affordable";
      explanation = `Affordable, but it would delay “${goalDelays[0]?.goalName}” by about ${goalDelays[0]?.delayDays} days.`;
      suggestedAction = "Buy only if that delay is acceptable.";
      score = 60;
    } else {
      verdict = "yes";
      tone = "green";
      headline = "Comfortably affordable";
      explanation = `You can buy it now and still have ${formatDollars(cashAfter)} above your safety buffer.`;
      suggestedAction = "Buy now if you still want it.";
      score = 90;
    }

    if (ongoingMonthlyCostCents > 0 && tone === "green") {
      tone = "amber";
      verdict = "technically_yes";
      explanation += ` Plus ${formatDollars(ongoingMonthlyCostCents)}/month ongoing.`;
      headline = "Technically affordable";
    }

    const shortfall = Math.max(0, subtractCents(netPriceCents, freeCash));
    const daysToAfford =
      shortfall > 0 && profile.incomeCents
        ? Math.ceil((shortfall / Math.max(profile.incomeCents, 1)) * 30)
        : shortfall > 0
          ? 30
          : 0;
    const suggestedWeeklySaveCents =
      shortfall > 0 ? Math.ceil(shortfall / Math.max(Math.ceil(daysToAfford / 7), 1)) : null;

    const impact: AffordabilityImpact = {
      before: {
        safeToSpendCents: freeCash,
        everydayCents: position.everydayCents,
        creditCardOwedCents: position.creditCardOwedCents,
        savingsCents: addCents(position.savingsCents, position.protectedSavingsCents),
      },
      after: {
        safeToSpendCents: Math.max(0, cashAfter),
        everydayCents:
          paymentMethod === "credit_card"
            ? position.everydayCents
            : Math.max(0, subtractCents(position.everydayCents, netPriceCents)),
        creditCardOwedCents:
          paymentMethod === "credit_card"
            ? addCents(position.creditCardOwedCents, netPriceCents)
            : position.creditCardOwedCents,
        savingsCents: addCents(position.savingsCents, position.protectedSavingsCents),
        billsCovered,
        protectedSavingsTouched: protectedSavingsUsed > 0,
        safetyBufferMaintained,
      },
    };

    return {
      verdict,
      score,
      explanation,
      cashAfterPurchaseCents: cashAfter,
      safeToSpendAfterPurchaseCents: Math.max(0, cashAfter),
      billsCovered,
      protectedSavingsUsedCents: protectedSavingsUsed,
      emergencyBufferRemainingCents: Math.max(0, cashAfter),
      goalDelays,
      earliestSafeDate:
        tone !== "green"
          ? profile.nextPayday ??
            format(addDays(new Date(), Math.max(daysToAfford, 1)), "yyyy-MM-dd")
          : null,
      workHoursCost,
      suggestedAction,
      assumptions: [
        "Credit limit is never treated as spendable wealth.",
        "Protected savings are excluded unless you explicitly allow them.",
        "Based on Safe to Spend until payday.",
      ],
      confidence: safeToSpend.confidence as ConfidenceLevel,
      tone,
      headline,
      cardCanPayButFinancesCant,
      impact,
      suggestedWeeklySaveCents,
      daysToAfford: shortfall > 0 ? daysToAfford : null,
    };
  }

  private calculateGoalDelays(
    goals: Goal[],
    purchaseCents: number,
    profile: Profile
  ): Array<{ goalId: string; goalName: string; delayDays: number }> {
    const monthlySavings =
      profile.incomeCents && profile.incomeType === "salary"
        ? Math.round(profile.incomeCents * 0.1)
        : 50000;

    if (monthlySavings <= 0) return [];
    const delayDays = Math.round((purchaseCents / monthlySavings) * 30);

    return goals
      .filter((g) => g.priority <= 2)
      .slice(0, 2)
      .map((g) => ({
        goalId: g.id,
        goalName: g.name,
        delayDays,
      }));
  }
}

function formatDollars(cents: number): string {
  return `$${(Math.abs(cents) / 100).toFixed(0)}`;
}

export const affordabilityService = new AffordabilityService();
