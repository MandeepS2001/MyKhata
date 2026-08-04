import type { Account, AccountType, TransactionType } from "@/domain/models";
import { accountPurpose } from "@/domain/services/money-position.service";

export type MoneyDirection = "spent" | "received" | "moved";

export interface BehaviourInferenceInput {
  direction: MoneyDirection;
  fromAccount: Account;
  toAccount?: Account | null;
  merchant?: string | null;
  suggestedCategory?: string | null;
}

export interface BehaviourInference {
  behaviour: TransactionType;
  category: string;
  confidence: number;
  label: string;
}

const SALARY_HINTS = [
  "salary",
  "payroll",
  "wage",
  "payslip",
  "employer",
  "direct credit",
];

function isSpendable(type: AccountType): boolean {
  return type === "everyday" || type === "cash";
}

function isSavingsLike(account: Account): boolean {
  const p = accountPurpose(account);
  return p === "savings" || p === "protected_savings";
}

export function inferBehaviour(
  input: BehaviourInferenceInput
): BehaviourInference {
  const { direction, fromAccount, toAccount, merchant, suggestedCategory } =
    input;
  const merchantLower = (merchant ?? "").toLowerCase();

  if (direction === "spent") {
    if (fromAccount.accountType === "credit_card") {
      return {
        behaviour: "credit_card_purchase",
        category: suggestedCategory || "shopping",
        confidence: 0.95,
        label: "Credit card purchase",
      };
    }
    return {
      behaviour: "expense",
      category: suggestedCategory || "other",
      confidence: 0.85,
      label: "Expense",
    };
  }

  if (direction === "received") {
    const looksLikeSalary = SALARY_HINTS.some((h) => merchantLower.includes(h));
    return {
      behaviour: "income",
      category: looksLikeSalary ? "income" : suggestedCategory || "income",
      confidence: looksLikeSalary ? 0.9 : 0.75,
      label: looksLikeSalary ? "Salary / income" : "Income",
    };
  }

  // Moved
  if (!toAccount) {
    return {
      behaviour: "internal_transfer",
      category: "transfer",
      confidence: 0.5,
      label: "Transfer",
    };
  }

  const fromPurpose = accountPurpose(fromAccount);
  const toPurpose = accountPurpose(toAccount);

  if (
    isSpendable(fromAccount.accountType) &&
    toAccount.accountType === "credit_card"
  ) {
    return {
      behaviour: "credit_card_repayment",
      category: "debt_repayment",
      confidence: 0.96,
      label: "Credit card payment",
    };
  }

  if (
    fromAccount.accountType === "credit_card" &&
    isSpendable(toAccount.accountType)
  ) {
    return {
      behaviour: "debt_draw",
      category: "transfer",
      confidence: 0.8,
      label: "Credit card cash advance",
    };
  }

  if (isSpendable(fromAccount.accountType) && isSavingsLike(toAccount)) {
    return {
      behaviour: "savings_contribution",
      category: "savings",
      confidence: 0.95,
      label: "Moved to savings",
    };
  }

  if (isSavingsLike(fromAccount) && isSpendable(toAccount.accountType)) {
    return {
      behaviour: "savings_withdrawal",
      category: "transfer",
      confidence: 0.95,
      label: "Moved from savings",
    };
  }

  if (
    fromAccount.accountType === "everyday" &&
    toAccount.accountType === "cash"
  ) {
    return {
      behaviour: "cash_withdrawal",
      category: "transfer",
      confidence: 0.92,
      label: "Cash withdrawal",
    };
  }

  if (
    fromAccount.accountType === "cash" &&
    toAccount.accountType === "everyday"
  ) {
    return {
      behaviour: "internal_transfer",
      category: "transfer",
      confidence: 0.9,
      label: "Cash deposited",
    };
  }

  if (fromPurpose === "daily_spending" && toPurpose === "loan") {
    return {
      behaviour: "debt_payment",
      category: "debt_repayment",
      confidence: 0.9,
      label: "Debt payment",
    };
  }

  return {
    behaviour: "internal_transfer",
    category: "transfer",
    confidence: 0.85,
    label: "Internal transfer",
  };
}

export function behaviourDisplayLabel(behaviour: TransactionType): string {
  switch (behaviour) {
    case "expense":
      return "Expense";
    case "income":
      return "Income";
    case "internal_transfer":
      return "Transfer";
    case "credit_card_purchase":
      return "Credit card purchase";
    case "credit_card_repayment":
      return "Credit card payment";
    case "savings_contribution":
      return "Moved to savings";
    case "savings_withdrawal":
      return "Moved from savings";
    case "cash_withdrawal":
      return "Cash withdrawal";
    case "refund":
      return "Refund";
    case "reversal":
      return "Reversal";
    case "debt_payment":
      return "Debt payment";
    case "debt_draw":
      return "Debt draw";
    case "bill":
      return "Bill";
    case "subscription":
      return "Subscription";
    default:
      return "Transaction";
  }
}
