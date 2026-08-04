import { parseToCents } from "@/lib/currency";

/** Parse bank statement balance strings like "+1,352.63", "-84.00", "123.45 DR". */
export function parseBalanceToCents(value: unknown): number | null {
  if (typeof value !== "string" || !value.trim()) return null;

  const cleaned = value.replace(/[$,\s]/g, "").trim();
  if (!cleaned) return null;

  const isDr = /dr$/i.test(cleaned);
  const isCr = /cr$/i.test(cleaned);
  const numeric = cleaned.replace(/(dr|cr)$/i, "");
  if (!numeric || numeric === "-" || numeric === "+") return null;

  let cents = parseToCents(numeric);
  if (isDr) cents = -Math.abs(cents);
  if (isCr) cents = Math.abs(cents);
  return cents;
}

export function signedTransactionCents(
  amountCents: number,
  direction: "debit" | "credit"
): number {
  return direction === "credit" ? amountCents : -amountCents;
}

/**
 * Resolve ledger balance for an account after import.
 * Everyday/savings: prefer latest CSV running balance.
 * Credit cards: use transaction net so purchases increase what you owe
 * (stored as a negative current_balance_cents).
 */
export function resolveAccountBalanceCents(input: {
  accountType: string;
  importedBalances: Array<{ date: string; balanceCents: number }>;
  transactionNetCents: number;
}): number {
  const { accountType, importedBalances, transactionNetCents } = input;

  if (accountType === "credit_card") {
    return transactionNetCents;
  }

  const latestCsv = [...importedBalances].sort((a, b) =>
    a.date < b.date ? 1 : a.date > b.date ? -1 : 0
  )[0];

  if (latestCsv) return latestCsv.balanceCents;
  return transactionNetCents;
}

/** Apply a signed transaction amount to an account's balances. */
export function applyTransactionToBalances(
  account: {
    accountType: string;
    currentBalanceCents: number;
    availableBalanceCents: number;
  },
  signedAmountCents: number
): { currentBalanceCents: number; availableBalanceCents: number } {
  const currentBalanceCents = account.currentBalanceCents + signedAmountCents;
  // Keep available in sync for non-credit accounts; for cards available may differ.
  const availableBalanceCents =
    account.accountType === "credit_card"
      ? account.availableBalanceCents
      : currentBalanceCents;
  return { currentBalanceCents, availableBalanceCents };
}
