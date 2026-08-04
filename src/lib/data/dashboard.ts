import { createClient } from "@/lib/supabase/server";
import { safeToSpendService } from "@/domain/services/safe-to-spend.service";
import { recurringPaymentService } from "@/domain/services/recurring.service";
import { cashFlowForecastService } from "@/domain/services/cashflow.service";
import { healthScoreService } from "@/domain/services/health-score.service";
import { insightService, type StructuredInsight } from "@/domain/services/insight.service";
import {
  calculateMoneyPosition,
  isRealExpense,
  type MoneyPosition,
} from "@/domain/services/money-position.service";
import { mapAccountRow, mapTransactionRow } from "@/lib/data/mappers";
import { narrateHomeSummary } from "@/lib/ai/coach";
import {
  declaredLivingCostsUntilPayday,
  looksLikeDeclaredCar,
  looksLikeDeclaredHousing,
} from "@/lib/living-costs";
import { addDays, parseISO } from "date-fns";
import type { Profile, SafeToSpendResult, Transaction } from "@/domain/models";

function mapProfile(row: Record<string, unknown>): Profile {
  return {
    id: row.id as string,
    displayName: row.display_name as string | null,
    currency: row.currency as string,
    timezone: row.timezone as string,
    locale: row.locale as string,
    paydayFrequency: row.payday_frequency as Profile["paydayFrequency"],
    nextPayday: row.next_payday as string | null,
    incomeType: row.income_type as Profile["incomeType"],
    incomeCents: row.income_cents as number | null,
    hourlyRateCents: row.hourly_rate_cents as number | null,
    estimatedTaxRate: row.estimated_tax_rate as number | null,
    financialTone: row.financial_tone as Profile["financialTone"],
    showWorkHours: row.show_work_hours as boolean,
    minimumBufferCents: row.minimum_buffer_cents as number,
    cautionLevel: row.caution_level as Profile["cautionLevel"],
    onboardingCompleted: row.onboarding_completed as boolean,
    isDemo: row.is_demo as boolean,
    hasCar: Boolean(row.has_car),
    carPaymentCents: (row.car_payment_cents as number | null) ?? null,
    carPaymentFrequency:
      (row.car_payment_frequency as Profile["carPaymentFrequency"]) ?? null,
    housingStatus: (row.housing_status as Profile["housingStatus"]) ?? null,
    rentFrequency: (row.rent_frequency as Profile["rentFrequency"]) ?? null,
    rentTotalCents: (row.rent_total_cents as number | null) ?? null,
    rentShareCents: (row.rent_share_cents as number | null) ?? null,
    rentIsSplit: Boolean(row.rent_is_split),
    mortgagePaymentCents: (row.mortgage_payment_cents as number | null) ?? null,
    mortgagePaymentFrequency:
      (row.mortgage_payment_frequency as Profile["mortgagePaymentFrequency"]) ??
      null,
    financialPriorities: Array.isArray(row.financial_priorities)
      ? (row.financial_priorities as string[])
      : [],
  };
}

function topCategoriesLast30Days(
  transactions: Transaction[]
): Array<{ category: string; amountCents: number }> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);

  const totals = new Map<string, number>();
  for (const t of transactions) {
    if (t.direction !== "debit") continue;
    if (!isRealExpense(t.behaviour ?? t.transactionType)) continue;
    if (new Date(t.transactionDate) < cutoff) continue;
    totals.set(t.category, (totals.get(t.category) ?? 0) + t.amountCents);
  }

  return [...totals.entries()]
    .map(([category, amountCents]) => ({ category, amountCents }))
    .sort((a, b) => b.amountCents - a.amountCents)
    .slice(0, 5);
}

/** Simple month-over-month spending pace comparison, used to flag "running hot". */
function calculateSpendingVelocityPct(transactions: Transaction[]): number {
  const now = new Date();
  const thirtyAgo = new Date(now);
  thirtyAgo.setDate(now.getDate() - 30);
  const sixtyAgo = new Date(now);
  sixtyAgo.setDate(now.getDate() - 60);

  const sumBetween = (from: Date, to: Date) =>
    transactions
      .filter((t) => {
        if (t.direction !== "debit") return false;
        if (!isRealExpense(t.behaviour ?? t.transactionType)) return false;
        const date = new Date(t.transactionDate);
        return date >= from && date < to;
      })
      .reduce((sum, t) => sum + Math.abs(t.amountCents), 0);

  const recent = sumBetween(thirtyAgo, now);
  const previous = sumBetween(sixtyAgo, thirtyAgo);
  if (previous <= 0) return 0;
  return Math.round(((recent - previous) / previous) * 100);
}

export async function getDashboardData() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const [profileRes, accountsRes, transactionsRes, insightsRes, goalsRes] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      supabase
        .from("accounts")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_archived", false),
      supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("transaction_date", { ascending: false })
        .limit(500),
      supabase
        .from("insights")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_dismissed", false)
        .order("created_at", { ascending: false })
        .limit(3),
      supabase
        .from("goals")
        .select("*")
        .eq("user_id", user.id)
        .order("priority", { ascending: true })
        .limit(3),
    ]);

  if (!profileRes.data) return null;

  const profile = mapProfile(profileRes.data);
  const accounts = (accountsRes.data ?? []).map(mapAccountRow);
  const transactions = (transactionsRes.data ?? []).map(mapTransactionRow);

  const daysUntilPayday = profile.nextPayday
    ? Math.max(
        0,
        Math.ceil(
          (new Date(profile.nextPayday).getTime() - Date.now()) /
            (1000 * 60 * 60 * 24)
        )
      )
    : 30;

  const recurring = recurringPaymentService.detect(transactions);

  const paydayCutoff = addDays(new Date(), daysUntilPayday);
  const declaredLiving = declaredLivingCostsUntilPayday(profile, daysUntilPayday);
  const hasDeclaredHousing =
    (profile.housingStatus === "rent" && (profile.rentShareCents ?? 0) > 0) ||
    (profile.housingStatus === "mortgage" &&
      (profile.mortgagePaymentCents ?? 0) > 0);
  const hasDeclaredCar =
    profile.hasCar && (profile.carPaymentCents ?? 0) > 0;

  const upcomingBillsCents =
    declaredLiving.totalCents +
    recurring
      .filter((r) => {
        if (!r.isEssential || parseISO(r.nextExpectedDate) > paydayCutoff) {
          return false;
        }
        // Prefer onboarding-declared rent/car so we don't double-count.
        if (
          hasDeclaredHousing &&
          looksLikeDeclaredHousing(r.merchant, r.category ?? "")
        ) {
          return false;
        }
        if (
          hasDeclaredCar &&
          looksLikeDeclaredCar(r.merchant, r.category ?? "")
        ) {
          return false;
        }
        return true;
      })
      .reduce((sum, r) => sum + r.typicalAmountCents, 0);

  const subscriptionCents = recurring
    .filter(
      (r) =>
        !r.isEssential && parseISO(r.nextExpectedDate) <= paydayCutoff
    )
    .reduce((sum, r) => sum + r.typicalAmountCents, 0);

  const expectedEssential = safeToSpendService.estimateEssentialSpend(
    transactions,
    daysUntilPayday
  );

  const spendingVelocityPct = calculateSpendingVelocityPct(transactions);

  const safeToSpend: SafeToSpendResult = safeToSpendService.calculate({
    profile,
    accounts,
    upcomingBillsCents,
    upcomingSubscriptionsCents: subscriptionCents,
    expectedEssentialSpendCents: expectedEssential,
    plannedGoalContributionsCents: 0,
    wishlistReservationsCents: 0,
    expectedIncomeCents: 0,
    transactionHistoryMonths: Math.min(3, transactions.length > 30 ? 3 : 1),
    includeGeneralSavings: false,
    spendingVelocityPct,
  });

  const moneyPosition: MoneyPosition = calculateMoneyPosition(accounts, {
    includeGeneralSavingsInSpendable: false,
  });

  const cashFlow = cashFlowForecastService.forecast({
    accounts,
    recurring,
    expectedIncomeCents: profile.incomeCents ?? 0,
    nextPayday: profile.nextPayday,
  });

  const healthScore = healthScoreService.calculate({
    profile,
    accounts,
    transactions,
    recurring,
    safeToSpendCents: safeToSpend.safeToSpendCents,
  });

  const creditCardDebtCents = moneyPosition.creditCardOwedCents;
  const totalCashCents = moneyPosition.everydayCents + moneyPosition.cashCents;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const fourteenDaysOut = addDays(today, 14);
  const upcomingRecurring = recurring
    .filter((r) => {
      const next = parseISO(r.nextExpectedDate);
      return next >= today && next <= fourteenDaysOut;
    })
    .sort((a, b) => a.nextExpectedDate.localeCompare(b.nextExpectedDate));

  const uncertainCount = transactions.filter(
    (t) => t.confidenceScore < 0.6
  ).length;

  const topCategories = topCategoriesLast30Days(transactions);

  const khataInsights: StructuredInsight[] = insightService.generate(transactions);

  const aiSummary = await narrateHomeSummary({
    tone: profile.financialTone,
    displayName: profile.displayName,
    safeToSpendCents: safeToSpend.safeToSpendCents,
    daysUntilPayday: safeToSpend.daysUntilPayday,
    creditCardDebtCents,
    upcomingBillsCents,
    topCategories,
    uncertainCount,
  });

  return {
    profile,
    accounts,
    transactions: transactions.slice(0, 8),
    insights: insightsRes.data ?? [],
    khataInsights,
    goals: goalsRes.data ?? [],
    safeToSpend,
    moneyPosition,
    uncertainCount,
    totalTransactions: transactions.length,
    upcomingBillsCents,
    recurring,
    cashFlow,
    healthScore,
    aiSummary,
    upcomingRecurring,
    creditCardDebtCents,
    totalCashCents,
    spendingVelocityPct,
  };
}
