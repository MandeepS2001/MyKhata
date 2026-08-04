"use server";

import { affordabilityService } from "@/domain/services/affordability.service";
import type { Goal } from "@/domain/models";
import { dollarsToCents } from "@/lib/currency";
import { getDashboardData } from "@/lib/data/dashboard";
import { narrateAffordability } from "@/lib/ai/coach";
import { z } from "zod";

const checkSchema = z.object({
  productName: z.string().trim().min(1).max(160),
  priceDollars: z.union([z.number(), z.string()]),
  productUrl: z.string().optional(),
  desiredPurchaseDate: z.string().optional(),
  paymentMethod: z.enum(["cash", "credit_card"]).optional(),
  allowProtectedSavings: z.boolean().optional(),
  ongoingMonthlyCostDollars: z.union([z.number(), z.string()]).optional(),
});

function mapGoal(row: Record<string, unknown>): Goal {
  return {
    id: row.id as string,
    userId: (row.user_id as string) ?? "",
    name: row.name as string,
    targetAmountCents: row.target_amount_cents as number,
    currentAmountCents: row.current_amount_cents as number,
    targetDate: (row.target_date as string) ?? null,
    priority: (row.priority as number) ?? 0,
    isProtected: (row.is_protected as boolean) ?? false,
    category: (row.category as string) ?? null,
    icon: (row.icon as string) ?? null,
  };
}

export async function checkAffordability(input: {
  productName: string;
  priceDollars: number | string;
  productUrl?: string;
  desiredPurchaseDate?: string;
  paymentMethod?: "cash" | "credit_card";
  allowProtectedSavings?: boolean;
  ongoingMonthlyCostDollars?: number | string;
}) {
  const parsed = checkSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Enter a product name and price." };
  }

  const priceCents = dollarsToCents(parsed.data.priceDollars);
  if (priceCents <= 0) {
    return { error: "Price must be greater than zero." };
  }

  const data = await getDashboardData();
  if (!data) {
    return { error: "Not authenticated" };
  }

  const goals = (data.goals as Record<string, unknown>[]).map(mapGoal);
  const ongoingMonthlyCostCents = parsed.data.ongoingMonthlyCostDollars
    ? dollarsToCents(parsed.data.ongoingMonthlyCostDollars)
    : 0;

  const result = affordabilityService.calculate({
    itemPriceCents: priceCents,
    savedAmountCents: 0,
    safeToSpend: data.safeToSpend,
    profile: data.profile,
    goals,
    accounts: data.accounts,
    upcomingBillsCents: data.upcomingBillsCents,
    allowProtectedSavings: parsed.data.allowProtectedSavings ?? false,
    paymentMethod: parsed.data.paymentMethod ?? "cash",
    ongoingMonthlyCostCents,
    targetDate: parsed.data.desiredPurchaseDate ?? null,
  });

  const narrative = await narrateAffordability({
    tone: data.profile.financialTone,
    productName: parsed.data.productName,
    priceCents,
    verdict: result.verdict,
    explanation: result.explanation,
    suggestedAction: result.suggestedAction,
    cashAfterPurchaseCents: result.cashAfterPurchaseCents,
    safeToSpendCents: data.safeToSpend.safeToSpendCents,
    daysUntilPayday: data.safeToSpend.daysUntilPayday,
  });

  return {
    success: true as const,
    result,
    narrative,
    productName: parsed.data.productName,
    priceCents,
    productUrl: parsed.data.productUrl ?? null,
    desiredPurchaseDate: parsed.data.desiredPurchaseDate ?? null,
  };
}
