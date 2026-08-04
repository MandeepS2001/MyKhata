import { describe, it, expect } from "vitest";
import {
  calculateMoneyPosition,
  isRealExpense,
  isIncomeBehaviour,
  creditCardOwedCents,
  availableCreditCents,
} from "@/domain/services/money-position.service";
import { affordabilityService } from "@/domain/services/affordability.service";
import { isLikelyDuplicate } from "@/domain/services/ingestion.service";
import type { Account, Goal, Profile, SafeToSpendResult } from "@/domain/models";

function makeAccount(overrides: Partial<Account> & Pick<Account, "id" | "accountType">): Account {
  return {
    userId: "u1",
    institutionId: null,
    name: "Account",
    institutionLabel: null,
    maskedIdentifier: null,
    currentBalanceCents: 0,
    availableBalanceCents: 0,
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

const baseProfile: Profile = {
  id: "u1",
  displayName: "Test",
  currency: "AUD",
  timezone: "Australia/Melbourne",
  locale: "en-AU",
  paydayFrequency: "monthly",
  nextPayday: new Date(Date.now() + 10 * 86400000).toISOString().split("T")[0]!,
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
};

function makeSafeToSpend(cents: number): SafeToSpendResult {
  return {
    safeToSpendCents: cents,
    confidence: "high",
    breakdown: [],
    assumptions: [],
    daysUntilPayday: 10,
    billsCovered: cents >= 0,
    savingsProtected: true,
    dailyPaceCents: Math.round(cents / 10),
    breathingRoom: cents > 20000 ? "comfortable" : "tight",
    breathingRoomReason: "test",
  };
}

describe("Behaviour vs expense classification", () => {
  it("treats a credit card purchase as a real expense", () => {
    expect(isRealExpense("credit_card_purchase")).toBe(true);
  });

  it("does not treat a credit card repayment as a real expense", () => {
    expect(isRealExpense("credit_card_repayment")).toBe(false);
  });

  it("does not treat a savings contribution as a real expense", () => {
    expect(isRealExpense("savings_contribution")).toBe(false);
    expect(isIncomeBehaviour("savings_contribution")).toBe(false);
  });

  it("treats income, refunds, and reimbursements as income behaviours", () => {
    expect(isIncomeBehaviour("income")).toBe(true);
    expect(isIncomeBehaviour("refund")).toBe(true);
    expect(isIncomeBehaviour("reimbursement")).toBe(true);
    expect(isIncomeBehaviour("expense")).toBe(false);
  });
});

describe("Protected savings exclusion", () => {
  it("excludes protected savings from spendable cash but counts it in net worth", () => {
    const accounts: Account[] = [
      makeAccount({
        id: "everyday",
        accountType: "everyday",
        currentBalanceCents: 200000,
        availableBalanceCents: 200000,
      }),
      makeAccount({
        id: "protected",
        accountType: "savings",
        isProtected: true,
        currentBalanceCents: 500000,
        availableBalanceCents: 500000,
      }),
    ];

    const position = calculateMoneyPosition(accounts);
    expect(position.spendableCashCents).toBe(200000);
    expect(position.protectedSavingsCents).toBe(500000);
    expect(position.totalAssetsCents).toBe(700000);
  });
});

describe("Credit limit is never treated as wealth", () => {
  it("excludes available credit from asset totals", () => {
    const accounts: Account[] = [
      makeAccount({
        id: "cc",
        accountType: "credit_card",
        currentBalanceCents: -20000,
        availableBalanceCents: 480000,
        creditLimitCents: 500000,
      }),
    ];

    const position = calculateMoneyPosition(accounts);
    expect(position.totalAssetsCents).toBe(0);
    expect(position.creditCardOwedCents).toBe(20000);
  });

  it("computes owed and available credit separately from wealth", () => {
    const card = makeAccount({
      id: "cc",
      accountType: "credit_card",
      currentBalanceCents: -84000,
      creditLimitCents: 500000,
    });
    expect(creditCardOwedCents(card)).toBe(84000);
    expect(availableCreditCents(card)).toBe(416000);
  });
});

describe("Affordability tone", () => {
  const goals: Goal[] = [];
  const accounts: Account[] = [
    makeAccount({
      id: "everyday",
      accountType: "everyday",
      currentBalanceCents: 300000,
      availableBalanceCents: 300000,
    }),
  ];

  it("returns green for a comfortably affordable purchase", () => {
    const result = affordabilityService.calculate({
      itemPriceCents: 5000,
      savedAmountCents: 0,
      safeToSpend: makeSafeToSpend(200000),
      profile: baseProfile,
      goals,
      accounts,
      upcomingBillsCents: 0,
      allowProtectedSavings: false,
      ongoingMonthlyCostCents: 0,
    });
    expect(result.tone).toBe("green");
    expect(result.verdict).toBe("yes");
  });

  it("returns amber when the purchase leaves the buffer thin", () => {
    const result = affordabilityService.calculate({
      itemPriceCents: 45000,
      savedAmountCents: 0,
      safeToSpend: makeSafeToSpend(50000),
      profile: baseProfile,
      goals,
      accounts,
      upcomingBillsCents: 0,
      allowProtectedSavings: false,
      ongoingMonthlyCostCents: 0,
    });
    expect(result.tone).toBe("amber");
  });

  it("returns red when the purchase is not safely affordable", () => {
    const result = affordabilityService.calculate({
      itemPriceCents: 500000,
      savedAmountCents: 0,
      safeToSpend: makeSafeToSpend(20000),
      profile: baseProfile,
      goals,
      accounts,
      upcomingBillsCents: 0,
      allowProtectedSavings: false,
      ongoingMonthlyCostCents: 0,
    });
    expect(result.tone).toBe("red");
  });

  it("flags when the card could pay but finances genuinely can't", () => {
    const result = affordabilityService.calculate({
      itemPriceCents: 100000,
      savedAmountCents: 0,
      safeToSpend: makeSafeToSpend(20000),
      profile: baseProfile,
      goals,
      accounts: [
        makeAccount({
          id: "cc",
          accountType: "credit_card",
          currentBalanceCents: 0,
          availableBalanceCents: 500000,
          creditLimitCents: 500000,
        }),
      ],
      upcomingBillsCents: 0,
      allowProtectedSavings: false,
      paymentMethod: "credit_card",
      ongoingMonthlyCostCents: 0,
    });
    expect(result.cardCanPayButFinancesCant).toBe(true);
    expect(result.tone).toBe("red");
  });
});

describe("Duplicate detection", () => {
  it("flags an exact match on provider transaction id", () => {
    const isDup = isLikelyDuplicate(
      {
        accountId: "a1",
        amountCents: -8740,
        transactionDate: "2026-07-01",
        description: "WOOLWORTHS 1234",
        providerTransactionId: "prov-1",
      },
      [
        {
          accountId: "a1",
          amountCents: -8740,
          transactionDate: "2026-07-01",
          description: "WOOLWORTHS 1234",
          providerTransactionId: "prov-1",
        },
      ]
    );
    expect(isDup).toBe(true);
  });

  it("flags likely duplicates from same account, amount, date, and similar description", () => {
    const isDup = isLikelyDuplicate(
      {
        accountId: "a1",
        amountCents: -8740,
        transactionDate: "2026-07-01",
        description: "WOOLWORTHS 1234 SOUTH MELB",
        providerTransactionId: null,
      },
      [
        {
          accountId: "a1",
          amountCents: -8740,
          transactionDate: "2026-07-01",
          description: "WOOLWORTHS 1234 SOUTH MELBOURNE",
          providerTransactionId: null,
        },
      ]
    );
    expect(isDup).toBe(true);
  });

  it("does not flag different amounts as duplicates", () => {
    const isDup = isLikelyDuplicate(
      {
        accountId: "a1",
        amountCents: -8740,
        transactionDate: "2026-07-01",
        description: "WOOLWORTHS 1234",
        providerTransactionId: null,
      },
      [
        {
          accountId: "a1",
          amountCents: -1200,
          transactionDate: "2026-07-01",
          description: "WOOLWORTHS 1234",
          providerTransactionId: null,
        },
      ]
    );
    expect(isDup).toBe(false);
  });
});
