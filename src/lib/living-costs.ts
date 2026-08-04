import type { Profile } from "@/domain/models";

type PaymentFrequency =
  | "weekly"
  | "fortnightly"
  | "monthly"
  | "quarterly"
  | "yearly"
  | "irregular";

const DAYS_PER: Record<PaymentFrequency, number> = {
  weekly: 7,
  fortnightly: 14,
  monthly: 30.44,
  quarterly: 91.31,
  yearly: 365.25,
  irregular: 30.44,
};

export function toMonthlyCents(
  amountCents: number,
  frequency: PaymentFrequency | null | undefined
): number {
  if (!amountCents || amountCents <= 0) return 0;
  const days = DAYS_PER[frequency ?? "monthly"] ?? 30.44;
  return Math.round((amountCents / days) * 30.44);
}

/** Estimate how much of a recurring payment falls before the next payday. */
export function amountUntilPayday(
  amountCents: number,
  frequency: PaymentFrequency | null | undefined,
  daysUntilPayday: number
): number {
  if (!amountCents || amountCents <= 0 || daysUntilPayday <= 0) return 0;
  const monthly = toMonthlyCents(amountCents, frequency);
  return Math.round((monthly / 30.44) * daysUntilPayday);
}

export function declaredLivingCostsUntilPayday(
  profile: Profile,
  daysUntilPayday: number
): { totalCents: number; lines: { label: string; amountCents: number }[] } {
  const lines: { label: string; amountCents: number }[] = [];

  if (profile.housingStatus === "rent" && (profile.rentShareCents ?? 0) > 0) {
    const amountCents = amountUntilPayday(
      profile.rentShareCents!,
      profile.rentFrequency,
      daysUntilPayday
    );
    if (amountCents > 0) {
      lines.push({
        label: profile.rentIsSplit ? "Your rent share" : "Rent",
        amountCents,
      });
    }
  }

  if (
    profile.housingStatus === "mortgage" &&
    (profile.mortgagePaymentCents ?? 0) > 0
  ) {
    const amountCents = amountUntilPayday(
      profile.mortgagePaymentCents!,
      profile.mortgagePaymentFrequency,
      daysUntilPayday
    );
    if (amountCents > 0) {
      lines.push({ label: "Mortgage", amountCents });
    }
  }

  if (profile.hasCar && (profile.carPaymentCents ?? 0) > 0) {
    const amountCents = amountUntilPayday(
      profile.carPaymentCents!,
      profile.carPaymentFrequency,
      daysUntilPayday
    );
    if (amountCents > 0) {
      lines.push({ label: "Car payment", amountCents });
    }
  }

  return {
    totalCents: lines.reduce((sum, l) => sum + l.amountCents, 0),
    lines,
  };
}

export function looksLikeDeclaredHousing(merchant: string, category: string): boolean {
  const hay = `${merchant} ${category}`.toLowerCase();
  return (
    hay.includes("rent") ||
    hay.includes("landlord") ||
    hay.includes("real estate") ||
    hay.includes("mortgage") ||
    category === "housing" ||
    category === "rent"
  );
}

export function looksLikeDeclaredCar(merchant: string, category: string): boolean {
  const hay = `${merchant} ${category}`.toLowerCase();
  return (
    hay.includes("car loan") ||
    hay.includes("vehicle") ||
    hay.includes("toyota finance") ||
    hay.includes("mazda finance") ||
    hay.includes("lexus financial") ||
    hay.includes("car finance") ||
    (category === "transport" && hay.includes("finance"))
  );
}
