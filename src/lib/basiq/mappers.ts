import type { AccountType } from "@/domain/models";
import type { BasiqAccount, BasiqTransaction } from "@/lib/basiq/client";
import { parseMoneyToCents } from "@/lib/basiq/client";
import type { NormalisedTransaction } from "@/domain/models";

export function mapBasiqAccountType(type?: string): AccountType {
  switch ((type ?? "").toLowerCase()) {
    case "transaction":
    case "checking":
    case "payment":
      return "everyday";
    case "savings":
      return "savings";
    case "credit-card":
    case "credit":
      return "credit_card";
    case "loan":
    case "mortgage":
      return "loan";
    case "term-deposit":
    case "investment":
      return "investment";
    default:
      return "other";
  }
}

/** MyKhata stores credit-card debt as a negative current_balance_cents. */
export function mapBasiqBalances(account: BasiqAccount): {
  currentBalanceCents: number;
  availableBalanceCents: number;
} {
  const accountType = mapBasiqAccountType(account.class?.type);
  let current = parseMoneyToCents(account.balance);
  const available = parseMoneyToCents(account.availableFunds ?? account.balance);

  if (accountType === "credit_card" && current > 0) {
    current = -current;
  }

  return {
    currentBalanceCents: current,
    availableBalanceCents: available,
  };
}

export function mapBasiqTransaction(
  txn: BasiqTransaction
): NormalisedTransaction | null {
  const dateRaw = txn.transactionDate || txn.postDate;
  if (!dateRaw) return null;

  const date = dateRaw.slice(0, 10);
  const amountCents = Math.abs(parseMoneyToCents(txn.amount));
  if (!amountCents) return null;

  const direction =
    txn.direction ??
    (parseMoneyToCents(txn.amount) < 0 ? "debit" : "credit");

  return {
    providerTransactionId: txn.id,
    transactionDate: date,
    postedDate: txn.postDate ? txn.postDate.slice(0, 10) : date,
    description: txn.description || "Bank transaction",
    normalisedMerchant: (txn.description || "Bank transaction")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 80),
    amountCents,
    direction,
    rawMetadata: {
      bank: "basiq",
      class: txn.class,
      balance: txn.balance,
      connection: txn.connection,
      institution: txn.institution,
    },
  };
}

export function displayInstitution(account: BasiqAccount): string {
  return account.class?.product || account.institution || "Connected bank";
}
