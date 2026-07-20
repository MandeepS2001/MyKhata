import { createClient } from "@/lib/supabase/server";
import { safeToSpendService } from "@/domain/services/safe-to-spend.service";
import type {
  Account,
  Profile,
  SafeToSpendResult,
  Transaction,
} from "@/domain/models";

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
  };
}

function mapAccount(row: Record<string, unknown>): Account {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    institutionId: row.institution_id as string | null,
    name: row.name as string,
    accountType: row.account_type as Account["accountType"],
    institutionLabel: row.institution_label as string | null,
    maskedIdentifier: row.masked_identifier as string | null,
    currentBalanceCents: row.current_balance_cents as number,
    availableBalanceCents: row.available_balance_cents as number,
    creditLimitCents: row.credit_limit_cents as number | null,
    currency: row.currency as string,
    includedInSafeToSpend: row.included_in_safe_to_spend as boolean,
    isProtected: row.is_protected as boolean,
    purpose: row.purpose as string | null,
    dataSource: row.data_source as Account["dataSource"],
    lastSyncedAt: row.last_synced_at as string | null,
    isArchived: row.is_archived as boolean,
  };
}

function mapTransaction(row: Record<string, unknown>): Transaction {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    accountId: row.account_id as string,
    providerTransactionId: row.provider_transaction_id as string | null,
    transactionDate: row.transaction_date as string,
    postedDate: row.posted_date as string | null,
    description: row.description as string,
    normalisedMerchant: row.normalised_merchant as string | null,
    amountCents: row.amount_cents as number,
    direction: row.direction as Transaction["direction"],
    category: row.category as string,
    subcategory: row.subcategory as string | null,
    confidenceScore: row.confidence_score as number,
    transactionType: row.transaction_type as Transaction["transactionType"],
    transferMatchId: row.transfer_match_id as string | null,
    isWorkExpense: row.is_work_expense as boolean,
    workUsePercentage: row.work_use_percentage as number,
    isReimbursable: row.is_reimbursable as boolean,
    notes: row.notes as string | null,
    source: row.source as Transaction["source"],
    importBatchId: row.import_batch_id as string | null,
  };
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
        .limit(100),
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
  const accounts = (accountsRes.data ?? []).map(mapAccount);
  const transactions = (transactionsRes.data ?? []).map(mapTransaction);

  const daysUntilPayday = profile.nextPayday
    ? Math.max(
        0,
        Math.ceil(
          (new Date(profile.nextPayday).getTime() - Date.now()) /
            (1000 * 60 * 60 * 24)
        )
      )
    : 30;

  const expectedEssential = safeToSpendService.estimateEssentialSpend(
    transactions,
    daysUntilPayday
  );

  // Estimate upcoming bills from recurring patterns
  const billCategories = new Set(["rent", "utilities", "insurance"]);
  const upcomingBillsCents = transactions
    .filter(
      (t) =>
        billCategories.has(t.category) &&
        t.transactionType === "bill" &&
        new Date(t.transactionDate) >
          new Date(Date.now() - 35 * 24 * 60 * 60 * 1000)
    )
    .reduce((sum, t) => sum + Math.abs(t.amountCents), 0);

  const subscriptionCents = transactions
    .filter(
      (t) =>
        (t.category === "subscriptions" || t.transactionType === "subscription") &&
        new Date(t.transactionDate) >
          new Date(Date.now() - 35 * 24 * 60 * 60 * 1000)
    )
    .reduce((sum, t) => sum + Math.abs(t.amountCents), 0);

  const safeToSpend: SafeToSpendResult = safeToSpendService.calculate({
    profile,
    accounts,
    upcomingBillsCents: Math.round(upcomingBillsCents * 0.8),
    upcomingSubscriptionsCents: subscriptionCents,
    expectedEssentialSpendCents: expectedEssential,
    plannedGoalContributionsCents: 0,
    wishlistReservationsCents: 0,
    expectedIncomeCents: 0,
    transactionHistoryMonths: Math.min(3, transactions.length > 30 ? 3 : 1),
  });

  const uncertainCount = transactions.filter(
    (t) => t.confidenceScore < 0.6
  ).length;

  return {
    profile,
    accounts,
    transactions: transactions.slice(0, 8),
    insights: insightsRes.data ?? [],
    goals: goalsRes.data ?? [],
    safeToSpend,
    uncertainCount,
    totalTransactions: transactions.length,
  };
}
