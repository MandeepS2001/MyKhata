/**
 * Unified ingestion helpers — Manual, CSV, Open Banking, future PDF all
 * flow through normalisation → dedupe → behaviour → category → persist.
 */

import type {
  Account,
  DataSource,
  TransactionDirection,
  TransactionType,
} from "@/domain/models";
import { inferBehaviour, type MoneyDirection } from "@/domain/services/behaviour.service";
import { categorisationService } from "@/domain/services/categorisation.service";
import type { MerchantRule } from "@/domain/models";

export interface IngestDraft {
  accountId: string;
  counterpartyAccountId?: string | null;
  moneyDirection: MoneyDirection;
  amountCents: number;
  description: string;
  transactionDate: string;
  notes?: string | null;
  categoryOverride?: string | null;
  behaviourOverride?: TransactionType | null;
  source: DataSource;
  providerTransactionId?: string | null;
  rawMetadata?: Record<string, unknown>;
}

export interface PreparedLeg {
  accountId: string;
  amountCents: number;
  direction: TransactionDirection;
  description: string;
  normalisedMerchant: string | null;
  category: string;
  transactionType: TransactionType;
  behaviourConfidence: number;
  categoryConfidence: number;
  notes: string | null;
  source: DataSource;
  providerTransactionId: string | null;
  rawMetadata: Record<string, unknown>;
  transferGroupId: string | null;
}

/** Map rich behaviours onto DB-safe transaction_type values that already exist. */
export function toPersistedTransactionType(
  behaviour: TransactionType
): TransactionType {
  switch (behaviour) {
    case "credit_card_purchase":
      return "expense";
    case "savings_contribution":
    case "savings_withdrawal":
    case "debt_draw":
      return "internal_transfer";
    case "debt_payment":
      return "credit_card_repayment";
    case "reversal":
      return "refund";
    default:
      return behaviour;
  }
}

export function prepareManualEntry(input: {
  draft: IngestDraft;
  accounts: Account[];
  merchantRules: MerchantRule[];
  transferGroupId?: string;
}): PreparedLeg[] {
  const { draft, accounts, merchantRules } = input;
  const from = accounts.find((a) => a.id === draft.accountId);
  if (!from) throw new Error("Account not found");

  const to = draft.counterpartyAccountId
    ? accounts.find((a) => a.id === draft.counterpartyAccountId) ?? null
    : null;

  const classified = categorisationService.classify(
    {
      providerTransactionId: draft.providerTransactionId ?? null,
      transactionDate: draft.transactionDate,
      postedDate: null,
      description: draft.description,
      normalisedMerchant: null,
      amountCents:
        draft.moneyDirection === "received"
          ? draft.amountCents
          : -Math.abs(draft.amountCents),
      direction: draft.moneyDirection === "received" ? "credit" : "debit",
      rawMetadata: {},
    },
    merchantRules
  );

  const inferred = inferBehaviour({
    direction: draft.moneyDirection,
    fromAccount: from,
    toAccount: to,
    merchant: draft.description,
    suggestedCategory: draft.categoryOverride || classified.category,
  });

  const behaviour = draft.behaviourOverride ?? inferred.behaviour;
  const category = draft.categoryOverride || inferred.category || classified.category;
  const groupId =
    draft.moneyDirection === "moved"
      ? input.transferGroupId ?? crypto.randomUUID()
      : null;

  const baseMeta = {
    ...(draft.rawMetadata ?? {}),
    behaviour,
    moneyDirection: draft.moneyDirection,
  };

  if (draft.moneyDirection !== "moved" || !to) {
    const isCredit = draft.moneyDirection === "received";
    return [
      {
        accountId: from.id,
        amountCents: isCredit
          ? Math.abs(draft.amountCents)
          : -Math.abs(draft.amountCents),
        direction: isCredit ? "credit" : "debit",
        description: draft.description,
        normalisedMerchant: categorisationService.normaliseMerchant(
          draft.description
        ),
        category,
        transactionType: toPersistedTransactionType(behaviour),
        behaviourConfidence: inferred.confidence,
        categoryConfidence: classified.confidenceScore,
        notes: draft.notes ?? null,
        source: draft.source,
        providerTransactionId: draft.providerTransactionId ?? null,
        rawMetadata: baseMeta,
        transferGroupId: null,
      },
    ];
  }

  // Linked transfer: debit from + credit to
  const amount = Math.abs(draft.amountCents);
  const label =
    behaviour === "savings_contribution"
      ? `→ ${to.name}`
      : behaviour === "savings_withdrawal"
        ? `← ${from.name}`
        : behaviour === "credit_card_repayment"
          ? `Payment to ${to.name}`
          : `${from.name} → ${to.name}`;

  const merchant = categorisationService.normaliseMerchant(draft.description);

  return [
    {
      accountId: from.id,
      amountCents: -amount,
      direction: "debit",
      description: draft.description || label,
      normalisedMerchant: merchant,
      category,
      transactionType: toPersistedTransactionType(behaviour),
      behaviourConfidence: inferred.confidence,
      categoryConfidence: classified.confidenceScore,
      notes: draft.notes ?? null,
      source: draft.source,
      providerTransactionId: draft.providerTransactionId ?? null,
      rawMetadata: { ...baseMeta, transferRole: "debit", counterpartyAccountId: to.id },
      transferGroupId: groupId,
    },
    {
      accountId: to.id,
      amountCents: amount,
      direction: "credit",
      description: draft.description || label,
      normalisedMerchant: merchant,
      category,
      transactionType: toPersistedTransactionType(behaviour),
      behaviourConfidence: inferred.confidence,
      categoryConfidence: classified.confidenceScore,
      notes: draft.notes ?? null,
      source: draft.source,
      providerTransactionId: draft.providerTransactionId
        ? `${draft.providerTransactionId}:credit`
        : null,
      rawMetadata: {
        ...baseMeta,
        transferRole: "credit",
        counterpartyAccountId: from.id,
      },
      transferGroupId: groupId,
    },
  ];
}

export interface DuplicateCandidate {
  accountId: string;
  amountCents: number;
  transactionDate: string;
  description: string;
  providerTransactionId?: string | null;
}

export function isLikelyDuplicate(
  candidate: DuplicateCandidate,
  existing: Array<{
    accountId: string;
    amountCents: number;
    transactionDate: string;
    description: string;
    providerTransactionId: string | null;
  }>
): boolean {
  if (
    candidate.providerTransactionId &&
    existing.some((e) => e.providerTransactionId === candidate.providerTransactionId)
  ) {
    return true;
  }

  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
  const candDesc = norm(candidate.description);

  return existing.some((e) => {
    if (e.accountId !== candidate.accountId) return false;
    if (Math.abs(e.amountCents) !== Math.abs(candidate.amountCents)) return false;
    if (e.transactionDate !== candidate.transactionDate) return false;
    const existingDesc = norm(e.description);
    return (
      existingDesc === candDesc ||
      existingDesc.includes(candDesc.slice(0, 12)) ||
      candDesc.includes(existingDesc.slice(0, 12))
    );
  });
}
