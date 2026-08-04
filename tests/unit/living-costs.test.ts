import { describe, it, expect } from "vitest";
import {
  amountUntilPayday,
  declaredLivingCostsUntilPayday,
  toMonthlyCents,
} from "@/lib/living-costs";
import type { Profile } from "@/domain/models";

const base: Profile = {
  id: "1",
  displayName: "Test",
  currency: "AUD",
  timezone: "Australia/Melbourne",
  locale: "en-AU",
  paydayFrequency: "monthly",
  nextPayday: null,
  incomeType: "salary",
  incomeCents: null,
  hourlyRateCents: null,
  estimatedTaxRate: null,
  financialTone: "direct",
  showWorkHours: false,
  minimumBufferCents: 50000,
  cautionLevel: "balanced",
  onboardingCompleted: true,
  isDemo: false,
  hasCar: true,
  carPaymentCents: 45000,
  carPaymentFrequency: "monthly",
  housingStatus: "rent",
  rentFrequency: "monthly",
  rentTotalCents: 220000,
  rentShareCents: 140000,
  rentIsSplit: true,
  mortgagePaymentCents: null,
  mortgagePaymentFrequency: null,
  financialPriorities: [],
};

describe("living costs", () => {
  it("converts fortnightly rent share to monthly", () => {
    expect(toMonthlyCents(140000, "fortnightly")).toBeGreaterThan(280000);
  });

  it("uses rent share not total when split", () => {
    const { totalCents, lines } = declaredLivingCostsUntilPayday(base, 30);
    expect(lines.some((l) => l.label === "Your rent share")).toBe(true);
    expect(totalCents).toBeGreaterThan(140000);
    expect(totalCents).toBeLessThan(220000 + 45000 + 5000);
  });

  it("prorates car payment before payday", () => {
    expect(amountUntilPayday(45000, "monthly", 15)).toBeGreaterThan(20000);
    expect(amountUntilPayday(45000, "monthly", 15)).toBeLessThan(45000);
  });
});
