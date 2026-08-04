import { addCents, subtractCents } from "@/lib/currency";
import type { Account, AccountType, Transaction, TransactionType } from "@/domain/models";

/** Display purpose for account types (DB keeps everyday/savings/etc for compatibility). */
export type AccountPurpose =
  | "daily_spending"
  | "savings"
  | "protected_savings"
  | "credit_card"
  | "cash"
  | "investment"
  | "loan"
  | "bnpl"
  | "other";

export function accountPurpose(account: Account): AccountPurpose {
  if (account.accountType === "credit_card") return "credit_card";
  if (account.accountType === "cash") return "cash";
  if (account.accountType === "loan") return "loan";
  if (account.accountType === "investment") return "investment";
  if (account.accountType === "everyday") return "daily_spending";
  if (account.accountType === "savings" || account.accountType === "offset") {
    return account.isProtected ? "protected_savings" : "savings";
  }
  return "other";
}

export function purposeLabel(purpose: AccountPurpose): string {
  switch (purpose) {
    case "daily_spending":
      return "Everyday";
    case "savings":
      return "Savings";
    case "protected_savings":
      return "Protected savings";
    case "credit_card":
      return "Credit card";
    case "cash":
      return "Cash";
    case "investment":
      return "Investment";
    case "loan":
      return "Loan";
    case "bnpl":
      return "BNPL";
    default:
      return "Other";
  }
}

export function accountTypeFromPurpose(
  purpose: AccountPurpose
): { accountType: AccountType; isProtected: boolean; includedInSafeToSpend: boolean } {
  switch (purpose) {
    case "daily_spending":
      return {
        accountType: "everyday",
        isProtected: false,
        includedInSafeToSpend: true,
      };
    case "savings":
      return {
        accountType: "savings",
        isProtected: false,
        includedInSafeToSpend: false,
      };
    case "protected_savings":
      return {
        accountType: "savings",
        isProtected: true,
        includedInSafeToSpend: false,
      };
    case "credit_card":
      return {
        accountType: "credit_card",
        isProtected: false,
        includedInSafeToSpend: false,
      };
    case "cash":
      return {
        accountType: "cash",
        isProtected: false,
        includedInSafeToSpend: true,
      };
    case "investment":
      return {
        accountType: "investment",
        isProtected: true,
        includedInSafeToSpend: false,
      };
    case "loan":
      return {
        accountType: "loan",
        isProtected: false,
        includedInSafeToSpend: false,
      };
    default:
      return {
        accountType: "other",
        isProtected: false,
        includedInSafeToSpend: false,
      };
  }
}

/** Behaviours that count as real spending/expenses for analytics. */
export const EXPENSE_BEHAVIOURS: TransactionType[] = [
  "expense",
  "credit_card_purchase",
  "bill",
  "subscription",
  "shared_expense",
];

export const NON_SPEND_BEHAVIOURS: TransactionType[] = [
  "internal_transfer",
  "credit_card_repayment",
  "savings_contribution",
  "savings_withdrawal",
  "cash_withdrawal",
  "debt_payment",
  "debt_draw",
];

export function isRealExpense(behaviour: TransactionType): boolean {
  return EXPENSE_BEHAVIOURS.includes(behaviour);
}

export function isIncomeBehaviour(behaviour: TransactionType): boolean {
  return behaviour === "income" || behaviour === "refund" || behaviour === "reimbursement";
}

export function creditCardOwedCents(account: Account): number {
  if (account.accountType !== "credit_card") return 0;
  return Math.max(0, -account.currentBalanceCents);
}

export function availableCreditCents(account: Account): number {
  if (account.accountType !== "credit_card" || !account.creditLimitCents) return 0;
  return Math.max(0, account.creditLimitCents - creditCardOwedCents(account));
}

export interface MoneyPosition {
  everydayCents: number;
  savingsCents: number;
  protectedSavingsCents: number;
  cashCents: number;
  creditCardOwedCents: number;
  loanOwedCents: number;
  investmentCents: number;
  totalAssetsCents: number;
  totalDebtCents: number;
  netPositionCents: number;
  spendableCashCents: number;
}

export function calculateMoneyPosition(
  accounts: Account[],
  options?: { includeGeneralSavingsInSpendable?: boolean }
): MoneyPosition {
  const includeSavings = options?.includeGeneralSavingsInSpendable ?? false;

  let everydayCents = 0;
  let savingsCents = 0;
  let protectedSavingsCents = 0;
  let cashCents = 0;
  let creditOwed = 0;
  let loanOwed = 0;
  let investmentCents = 0;

  for (const account of accounts) {
    if (account.isArchived) continue;
    const purpose = accountPurpose(account);
    const bal = account.availableBalanceCents;

    switch (purpose) {
      case "daily_spending":
        everydayCents = addCents(everydayCents, bal);
        break;
      case "cash":
        cashCents = addCents(cashCents, bal);
        break;
      case "protected_savings":
        protectedSavingsCents = addCents(protectedSavingsCents, bal);
        break;
      case "savings":
        savingsCents = addCents(savingsCents, bal);
        break;
      case "credit_card":
        creditOwed = addCents(creditOwed, creditCardOwedCents(account));
        break;
      case "loan":
        loanOwed = addCents(loanOwed, Math.max(0, -account.currentBalanceCents));
        break;
      case "investment":
        investmentCents = addCents(investmentCents, bal);
        break;
      default:
        if (account.includeInNetWorth !== false && bal > 0) {
          savingsCents = addCents(savingsCents, bal);
        }
        break;
    }
  }

  const totalAssetsCents = addCents(
    everydayCents,
    savingsCents,
    protectedSavingsCents,
    cashCents,
    investmentCents
  );
  const totalDebtCents = addCents(creditOwed, loanOwed);
  const netPositionCents = subtractCents(totalAssetsCents, totalDebtCents);

  let spendableCashCents = addCents(everydayCents, cashCents);
  if (includeSavings) {
    spendableCashCents = addCents(spendableCashCents, savingsCents);
  }

  return {
    everydayCents,
    savingsCents,
    protectedSavingsCents,
    cashCents,
    creditCardOwedCents: creditOwed,
    loanOwedCents: loanOwed,
    investmentCents,
    totalAssetsCents,
    totalDebtCents,
    netPositionCents,
    spendableCashCents,
  };
}

export type BreathingRoom = "comfortable" | "stable" | "tight" | "critical";

export function calculateBreathingRoom(input: {
  safeToSpendCents: number;
  daysUntilPayday: number;
  billsCovered: boolean;
  spendingVelocityPct: number;
}): { status: BreathingRoom; reason: string } {
  const { safeToSpendCents, daysUntilPayday, billsCovered, spendingVelocityPct } =
    input;
  const daily = daysUntilPayday > 0 ? safeToSpendCents / daysUntilPayday : 0;

  if (!billsCovered || safeToSpendCents <= 0) {
    return {
      status: "critical",
      reason: "Bills are not fully covered, or free cash is gone before payday.",
    };
  }
  if (daily < 1500 || spendingVelocityPct >= 25) {
    return {
      status: "tight",
      reason: "Free cash per day is low, or spending is running hot.",
    };
  }
  if (daily < 4000 || spendingVelocityPct >= 10) {
    return {
      status: "stable",
      reason: "You can cover bills with a modest cushion until payday.",
    };
  }
  return {
    status: "comfortable",
    reason: "Bills covered, savings protected, and a healthy cushion remains.",
  };
}

/** True expense amount for analytics — excludes transfers/CC payments/etc. */
export function expenseAmountForAnalytics(txn: Transaction): number {
  if (txn.direction !== "debit") return 0;
  if (!isRealExpense(txn.transactionType)) return 0;
  return Math.abs(txn.amountCents);
}
