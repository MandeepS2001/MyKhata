import { describe, it, expect } from "vitest";
import { inferBehaviour, behaviourDisplayLabel } from "@/domain/services/behaviour.service";
import type { Account } from "@/domain/models";

function makeAccount(overrides: Partial<Account> & Pick<Account, "id" | "accountType">): Account {
  return {
    userId: "u1",
    institutionId: null,
    name: "Account",
    institutionLabel: null,
    maskedIdentifier: null,
    currentBalanceCents: 100000,
    availableBalanceCents: 100000,
    creditLimitCents: null,
    currency: "AUD",
    includedInSafeToSpend: true,
    isProtected: false,
    includeInNetWorth: true,
    purpose: null,
    icon: null,
    dataSource: "manual",
    lastSyncedAt: null,
    isArchived: false,
    ...overrides,
  };
}

const everyday = makeAccount({ id: "everyday", accountType: "everyday" });
const cash = makeAccount({ id: "cash", accountType: "cash" });
const creditCard = makeAccount({ id: "cc", accountType: "credit_card" });
const savings = makeAccount({ id: "savings", accountType: "savings", isProtected: false });
const protectedSavings = makeAccount({
  id: "protected",
  accountType: "savings",
  isProtected: true,
});

describe("inferBehaviour", () => {
  it("classifies a spend from a credit card as a credit card purchase", () => {
    const result = inferBehaviour({
      direction: "spent",
      fromAccount: creditCard,
      merchant: "JB HI-FI",
    });
    expect(result.behaviour).toBe("credit_card_purchase");
  });

  it("classifies a spend from an everyday account as a plain expense", () => {
    const result = inferBehaviour({
      direction: "spent",
      fromAccount: everyday,
      merchant: "WOOLWORTHS",
    });
    expect(result.behaviour).toBe("expense");
  });

  it("classifies received money with salary hints as income", () => {
    const result = inferBehaviour({
      direction: "received",
      fromAccount: everyday,
      merchant: "ITSOFT PTY LTD PAYROLL",
    });
    expect(result.behaviour).toBe("income");
    expect(result.confidence).toBeGreaterThan(0.85);
  });

  it("classifies everyday -> credit card as a repayment, not an expense", () => {
    const result = inferBehaviour({
      direction: "moved",
      fromAccount: everyday,
      toAccount: creditCard,
    });
    expect(result.behaviour).toBe("credit_card_repayment");
  });

  it("classifies credit card -> everyday as a debt draw", () => {
    const result = inferBehaviour({
      direction: "moved",
      fromAccount: creditCard,
      toAccount: everyday,
    });
    expect(result.behaviour).toBe("debt_draw");
  });

  it("classifies everyday -> savings as a savings contribution", () => {
    const result = inferBehaviour({
      direction: "moved",
      fromAccount: everyday,
      toAccount: savings,
    });
    expect(result.behaviour).toBe("savings_contribution");
  });

  it("classifies everyday -> protected savings as a savings contribution", () => {
    const result = inferBehaviour({
      direction: "moved",
      fromAccount: everyday,
      toAccount: protectedSavings,
    });
    expect(result.behaviour).toBe("savings_contribution");
  });

  it("classifies savings -> everyday as a savings withdrawal", () => {
    const result = inferBehaviour({
      direction: "moved",
      fromAccount: savings,
      toAccount: everyday,
    });
    expect(result.behaviour).toBe("savings_withdrawal");
  });

  it("classifies everyday -> cash as a cash withdrawal", () => {
    const result = inferBehaviour({
      direction: "moved",
      fromAccount: everyday,
      toAccount: cash,
    });
    expect(result.behaviour).toBe("cash_withdrawal");
  });
});

describe("behaviourDisplayLabel", () => {
  it("gives transfers human-friendly labels instead of raw enum values", () => {
    expect(behaviourDisplayLabel("savings_contribution")).toBe("Moved to savings");
    expect(behaviourDisplayLabel("credit_card_repayment")).toBe("Credit card payment");
    expect(behaviourDisplayLabel("expense")).toBe("Expense");
  });
});
