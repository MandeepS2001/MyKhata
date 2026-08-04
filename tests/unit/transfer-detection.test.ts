import { describe, it, expect } from "vitest";
import { TransferDetectionService } from "@/domain/services/transfer-detection.service";
import type { Transaction } from "@/domain/models";

function makeTxn(overrides: Partial<Transaction> & { id: string }): Transaction {
  return {
    userId: "u1",
    accountId: "a1",
    providerTransactionId: null,
    transactionDate: "2025-07-01",
    postedDate: null,
    description: "Transfer",
    normalisedMerchant: null,
    amountCents: 70000,
    direction: "debit",
    category: "transfer",
    subcategory: null,
    confidenceScore: 0.9,
    transactionType: "unknown",
    behaviour: "unknown",
    transferMatchId: null,
    transferGroupId: null,
    isWorkExpense: false,
    workUsePercentage: 0,
    isReimbursable: false,
    notes: null,
    source: "mock",
    importBatchId: null,
    ...overrides,
  };
}

describe("TransferDetectionService", () => {
  const service = new TransferDetectionService();

  it("matches internal transfers between accounts", () => {
    const transactions = [
      makeTxn({
        id: "t1",
        accountId: "westpac",
        direction: "debit",
        description: "OSKO PAYMENT TO MANDEEP",
      }),
      makeTxn({
        id: "t2",
        accountId: "commbank",
        direction: "credit",
        description: "TRANSFER FROM WESTPAC",
      }),
    ];

    const matches = service.detectMatches(transactions);
    expect(matches).toHaveLength(1);
    expect(matches[0]!.matchType).toBe("internal_transfer");
  });

  it("detects credit card repayments", () => {
    const transactions = [
      makeTxn({
        id: "t1",
        accountId: "everyday",
        direction: "debit",
        description: "COMMBANK CC PAYMENT",
      }),
      makeTxn({
        id: "t2",
        accountId: "creditcard",
        direction: "credit",
        description: "PAYMENT RECEIVED - THANK YOU",
      }),
    ];

    const matches = service.detectMatches(transactions);
    expect(matches).toHaveLength(1);
    expect(matches[0]!.matchType).toBe("credit_card_repayment");
  });
});
