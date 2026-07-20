import { addCents, centsToWorkHours, subtractCents } from "@/lib/currency";
import type {
  AffordabilityResult,
  AffordabilityVerdict,
  Goal,
  Profile,
  SafeToSpendResult,
} from "@/domain/models";

export interface AffordabilityInput {
  itemPriceCents: number;
  savedAmountCents: number;
  safeToSpend: SafeToSpendResult;
  profile: Profile;
  goals: Goal[];
  upcomingBillsCents: number;
  allowProtectedSavings: boolean;
  protectedSavingsCents: number;
  ongoingMonthlyCostCents: number;
  targetDate?: string | null;
}

export class AffordabilityService {
  calculate(input: AffordabilityInput): AffordabilityResult {
    const {
      itemPriceCents,
      savedAmountCents,
      safeToSpend,
      profile,
      goals,
      upcomingBillsCents,
      allowProtectedSavings,
      protectedSavingsCents,
      ongoingMonthlyCostCents,
    } = input;

    const netPriceCents = Math.max(0, subtractCents(itemPriceCents, savedAmountCents));
    const afterTaxHourly = profile.hourlyRateCents && profile.estimatedTaxRate
      ? Math.round(
          profile.hourlyRateCents * (1 - (profile.estimatedTaxRate ?? 0) / 100)
        )
      : null;

    const workHoursCost =
      afterTaxHourly && profile.showWorkHours
        ? centsToWorkHours(netPriceCents, afterTaxHourly)
        : null;

    const availableForPurchase = subtractCents(
      addCents(safeToSpend.safeToSpendCents, savedAmountCents),
      0
    );

    const cashAfterPurchase = subtractCents(
      safeToSpend.safeToSpendCents,
      netPriceCents
    );

    const bufferRemaining = cashAfterPurchase;
    const billsCovered = cashAfterPurchase >= 0 && upcomingBillsCents <= safeToSpend.safeToSpendCents;

    let protectedSavingsUsed = 0;
    if (cashAfterPurchase < 0 && allowProtectedSavings) {
      protectedSavingsUsed = Math.min(
        protectedSavingsCents,
        Math.abs(cashAfterPurchase)
      );
    }

    const goalDelays = this.calculateGoalDelays(goals, netPriceCents, profile);

    let verdict: AffordabilityVerdict;
    let explanation: string;
    let suggestedAction: string;
    let score: number;

    if (safeToSpend.safeToSpendCents <= 0 && netPriceCents > 0) {
      verdict = "absolutely_not";
      explanation =
        "You are already projected to run short before payday. This purchase would make it worse.";
      suggestedAction = "Do not buy this right now.";
      score = 10;
    } else if (netPriceCents > availableForPurchase && !allowProtectedSavings) {
      verdict = "no";
      explanation = `Buying this would leave you short for upcoming bills.`;
      suggestedAction = "Wait until after your next payday.";
      score = 20;
    } else if (
      netPriceCents > availableForPurchase &&
      allowProtectedSavings &&
      netPriceCents <= addCents(availableForPurchase, protectedSavingsCents)
    ) {
      verdict = "protected_savings_required";
      explanation =
        "You could afford this, but only by dipping into protected savings.";
      suggestedAction = "Reconsider — your protected funds have a purpose.";
      score = 35;
    } else if (bufferRemaining < profile.minimumBufferCents && bufferRemaining >= 0) {
      verdict = "technically_yes";
      explanation = `You can buy this, but your safe-to-spend would drop significantly.`;
      suggestedAction = "Technically possible, but risky.";
      score = 55;
    } else if (goalDelays.some((g) => g.delayDays > 14)) {
      verdict = "technically_yes";
      explanation = `Affordable, but it would delay a goal by ${goalDelays[0]?.delayDays} days.`;
      suggestedAction = "Buy only if the goal delay is acceptable.";
      score = 60;
    } else if (netPriceCents <= availableForPurchase && billsCovered) {
      verdict = "yes";
      explanation = "You can afford this without missing any bills.";
      suggestedAction = "Buy now if you still want it.";
      score = 90;
    } else {
      verdict = "wait";
      explanation = "This becomes safer after your next income.";
      suggestedAction = "Wait until payday.";
      score = 45;
    }

    if (ongoingMonthlyCostCents > 0 && verdict === "yes") {
      verdict = "technically_yes";
      explanation += ` Plus $${(ongoingMonthlyCostCents / 100).toFixed(2)}/month ongoing.`;
    }

    return {
      verdict,
      score,
      explanation,
      cashAfterPurchaseCents: cashAfterPurchase,
      safeToSpendAfterPurchaseCents: Math.max(0, cashAfterPurchase),
      billsCovered,
      protectedSavingsUsedCents: protectedSavingsUsed,
      emergencyBufferRemainingCents: Math.max(0, bufferRemaining),
      goalDelays,
      earliestSafeDate: verdict === "wait" ? profile.nextPayday : null,
      workHoursCost,
      suggestedAction,
      assumptions: [
        "Based on the information available.",
        "The calculation assumes current spending pace continues.",
      ],
      confidence: safeToSpend.confidence,
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

export const affordabilityService = new AffordabilityService();
