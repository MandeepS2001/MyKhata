import { describe, expect, it } from "vitest";
import { recurringPaymentService } from "@/domain/services/recurring.service";
import { healthScoreService } from "@/domain/services/health-score.service";
import type { Account, Profile, Transaction } from "@/domain/models";

function txn(
  partial: Partial<Transaction> & Pick<Transaction, "description" | "amountCents" | "transactionDate">
): Transaction {
  return {
    id: crypto.randomUUID(),
    userId: "u1",
    accountId: "a1",
    providerTransactionId: null,
    postedDate: partial.transactionDate,
    normalisedMerchant: partial.description,
    direction: "debit",
    category: "subscriptions",
    subcategory: null,
    confidenceScore: 0.9,
    transactionType: "subscription",
    behaviour: "subscription",
    transferMatchId: null,
    transferGroupId: null,
    isWorkExpense: false,
    workUsePercentage: 0,
    isReimbursable: false,
    notes: null,
    source: "csv",
    importBatchId: null,
    ...partial,
  };
}

describe("RecurringPaymentService", () => {
  it("detects monthly subscriptions", () => {
    const txns = [
      txn({ description: "NETFLIX.COM", amountCents: 2299, transactionDate: "2026-05-01" }),
      txn({ description: "NETFLIX.COM", amountCents: 2299, transactionDate: "2026-06-01" }),
      txn({ description: "NETFLIX.COM", amountCents: 2299, transactionDate: "2026-07-01" }),
    ];
    const detected = recurringPaymentService.detect(txns);
    expect(detected.length).toBeGreaterThan(0);
    expect(detected[0]?.frequency).toBe("monthly");
    expect(detected[0]?.annualCostCents).toBe(2299 * 12);
  });
});

describe("HealthScoreService", () => {
  it("returns a bounded score", () => {
    const profile = {
      id: "u1",
      displayName: "Test",
      currency: "AUD",
      timezone: "Australia/Melbourne",
      locale: "en-AU",
      paydayFrequency: "monthly",
      nextPayday: "2026-08-15",
      incomeType: "salary",
      incomeCents: 400000,
      hourlyRateCents: null,
      estimatedTaxRate: null,
      financialTone: "direct",
      showWorkHours: false,
      minimumBufferCents: 50000,
      cautionLevel: "balanced",
      onboardingCompleted: true,
      isDemo: false,
      hasCar: false,
      carPaymentCents: null,
      carPaymentFrequency: null,
      housingStatus: null,
      rentFrequency: null,
      rentTotalCents: null,
      rentShareCents: null,
      rentIsSplit: false,
      mortgagePaymentCents: null,
      mortgagePaymentFrequency: null,
      financialPriorities: [],
    } satisfies Profile;

    const accounts: Account[] = [
      {
        id: "a1",
        userId: "u1",
        institutionId: null,
        name: "Everyday",
        accountType: "everyday",
        institutionLabel: "CommBank",
        maskedIdentifier: null,
        currentBalanceCents: 200000,
        availableBalanceCents: 200000,
        creditLimitCents: null,
        currency: "AUD",
        includedInSafeToSpend: true,
        isProtected: false,
        includeInNetWorth: true,
        purpose: null,
        icon: null,
        dataSource: "csv",
        lastSyncedAt: null,
        isArchived: false,
      },
    ];

    const result = healthScoreService.calculate({
      profile,
      accounts,
      transactions: [],
      recurring: [],
      safeToSpendCents: 80000,
    });

    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.grade).toBeTruthy();
  });
});
