import { describe, it, expect } from "vitest";
import { SafeToSpendService } from "@/domain/services/safe-to-spend.service";
import type { Account, Profile } from "@/domain/models";

const baseProfile: Profile = {
  id: "1",
  displayName: "Test",
  currency: "AUD",
  timezone: "Australia/Melbourne",
  locale: "en-AU",
  paydayFrequency: "monthly",
  nextPayday: new Date(Date.now() + 12 * 86400000).toISOString().split("T")[0]!,
  incomeType: "salary",
  incomeCents: 412600,
  hourlyRateCents: 4500,
  estimatedTaxRate: 22,
  financialTone: "direct",
  showWorkHours: false,
  minimumBufferCents: 50000,
  cautionLevel: "balanced",
  onboardingCompleted: true,
  isDemo: false,
};

const accounts: Account[] = [
  {
    id: "a1",
    userId: "1",
    institutionId: null,
    name: "Everyday",
    accountType: "everyday",
    institutionLabel: "CommBank",
    maskedIdentifier: "****1234",
    currentBalanceCents: 284700,
    availableBalanceCents: 284700,
    creditLimitCents: null,
    currency: "AUD",
    includedInSafeToSpend: true,
    isProtected: false,
    purpose: "Daily spending",
    dataSource: "mock",
    lastSyncedAt: null,
    isArchived: false,
  },
  {
    id: "a2",
    userId: "1",
    institutionId: null,
    name: "Credit Card",
    accountType: "credit_card",
    institutionLabel: "CommBank",
    maskedIdentifier: "****5678",
    currentBalanceCents: -84000,
    availableBalanceCents: 416000,
    creditLimitCents: 500000,
    currency: "AUD",
    includedInSafeToSpend: true,
    isProtected: false,
    purpose: "Credit card",
    dataSource: "mock",
    lastSyncedAt: null,
    isArchived: false,
  },
  {
    id: "a3",
    userId: "1",
    institutionId: null,
    name: "Savings",
    accountType: "savings",
    institutionLabel: "Westpac",
    maskedIdentifier: "****9012",
    currentBalanceCents: 485000,
    availableBalanceCents: 485000,
    creditLimitCents: null,
    currency: "AUD",
    includedInSafeToSpend: false,
    isProtected: true,
    purpose: "Business fund",
    dataSource: "mock",
    lastSyncedAt: null,
    isArchived: false,
  },
];

describe("SafeToSpendService", () => {
  const service = new SafeToSpendService();

  it("calculates safe to spend with obligations", () => {
    const result = service.calculate({
      profile: baseProfile,
      accounts,
      upcomingBillsCents: 192000,
      upcomingSubscriptionsCents: 7000,
      expectedEssentialSpendCents: 62000,
      plannedGoalContributionsCents: 0,
      wishlistReservationsCents: 0,
      expectedIncomeCents: 0,
      transactionHistoryMonths: 3,
    });

    expect(result.safeToSpendCents).toBeGreaterThanOrEqual(0);
    expect(result.breakdown.length).toBeGreaterThan(3);
    expect(result.confidence).toBe("high");
  });

  it("excludes protected savings from usable cash", () => {
    const result = service.calculate({
      profile: baseProfile,
      accounts,
      upcomingBillsCents: 0,
      upcomingSubscriptionsCents: 0,
      expectedEssentialSpendCents: 0,
      plannedGoalContributionsCents: 0,
      wishlistReservationsCents: 0,
      expectedIncomeCents: 0,
      transactionHistoryMonths: 3,
    });

    const protectedLine = result.breakdown.find((b) =>
      b.label.includes("Protected")
    );
    expect(protectedLine?.amountCents).toBe(-485000);
  });
});
