import type { Account, Transaction } from "@/domain/models";

/** Shared row → domain mappers so every page/action stays in sync with the schema. */

export function mapAccountRow(row: Record<string, unknown>): Account {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    institutionId: (row.institution_id as string) ?? null,
    name: row.name as string,
    accountType: row.account_type as Account["accountType"],
    institutionLabel: (row.institution_label as string) ?? null,
    maskedIdentifier: (row.masked_identifier as string) ?? null,
    currentBalanceCents: row.current_balance_cents as number,
    availableBalanceCents: row.available_balance_cents as number,
    creditLimitCents: (row.credit_limit_cents as number) ?? null,
    currency: (row.currency as string) ?? "AUD",
    includedInSafeToSpend: Boolean(row.included_in_safe_to_spend),
    isProtected: Boolean(row.is_protected),
    includeInNetWorth:
      row.include_in_net_worth === undefined || row.include_in_net_worth === null
        ? row.account_type !== "credit_card" && row.account_type !== "loan"
        : Boolean(row.include_in_net_worth),
    purpose: (row.purpose as string) ?? null,
    icon: (row.icon as string) ?? null,
    dataSource: (row.data_source as Account["dataSource"]) ?? "manual",
    lastSyncedAt: (row.last_synced_at as string) ?? null,
    isArchived: Boolean(row.is_archived),
  };
}

export function mapTransactionRow(row: Record<string, unknown>): Transaction {
  const rawMetadata = (row.raw_metadata as Record<string, unknown>) ?? {};
  const transactionType = row.transaction_type as Transaction["transactionType"];
  const behaviour =
    (rawMetadata.behaviour as Transaction["behaviour"] | undefined) ?? transactionType;
  const transferGroupId =
    (rawMetadata.transfer_group_id as string | undefined) ??
    (row.transfer_match_id as string | null) ??
    null;

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
    confidenceScore: Number(row.confidence_score ?? 0),
    transactionType,
    behaviour,
    transferMatchId: (row.transfer_match_id as string | null) ?? null,
    transferGroupId,
    isWorkExpense: Boolean(row.is_work_expense),
    workUsePercentage: Number(row.work_use_percentage ?? 0),
    isReimbursable: Boolean(row.is_reimbursable),
    notes: row.notes as string | null,
    source: row.source as Transaction["source"],
    importBatchId: row.import_batch_id as string | null,
  };
}
