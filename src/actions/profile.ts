"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const paymentFrequency = z.enum([
  "weekly",
  "fortnightly",
  "monthly",
  "quarterly",
  "yearly",
  "irregular",
]);

const housingStatus = z.enum([
  "rent",
  "own_outright",
  "mortgage",
  "live_with_family",
  "other",
]);

const profileSchema = z.object({
  displayName: z.string().min(1).max(100),
  currency: z.string().default("AUD"),
  paydayFrequency: z.enum(["weekly", "fortnightly", "monthly", "irregular"]),
  nextPayday: z.string().optional(),
  incomeType: z.enum(["hourly", "salary", "variable", "mixed"]),
  incomeCents: z.number().optional(),
  financialTone: z.enum(["direct", "blunt", "roast"]),
  hasCar: z.boolean().optional(),
  carPaymentCents: z.number().nullable().optional(),
  carPaymentFrequency: paymentFrequency.nullable().optional(),
  housingStatus: housingStatus.nullable().optional(),
  rentFrequency: paymentFrequency.nullable().optional(),
  rentTotalCents: z.number().nullable().optional(),
  rentShareCents: z.number().nullable().optional(),
  rentIsSplit: z.boolean().optional(),
  mortgagePaymentCents: z.number().nullable().optional(),
  mortgagePaymentFrequency: paymentFrequency.nullable().optional(),
});

export async function updateProfile(data: z.infer<typeof profileSchema>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const parsed = profileSchema.safeParse(data);
  if (!parsed.success) return { error: "Invalid profile data" };

  const d = parsed.data;
  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: d.displayName,
      currency: d.currency,
      payday_frequency: d.paydayFrequency,
      next_payday: d.nextPayday,
      income_type: d.incomeType,
      income_cents: d.incomeCents,
      financial_tone: d.financialTone,
      ...(d.hasCar !== undefined ? { has_car: d.hasCar } : {}),
      ...(d.carPaymentCents !== undefined
        ? { car_payment_cents: d.carPaymentCents }
        : {}),
      ...(d.carPaymentFrequency !== undefined
        ? { car_payment_frequency: d.carPaymentFrequency }
        : {}),
      ...(d.housingStatus !== undefined
        ? { housing_status: d.housingStatus }
        : {}),
      ...(d.rentFrequency !== undefined
        ? { rent_frequency: d.rentFrequency }
        : {}),
      ...(d.rentTotalCents !== undefined
        ? { rent_total_cents: d.rentTotalCents }
        : {}),
      ...(d.rentShareCents !== undefined
        ? { rent_share_cents: d.rentShareCents }
        : {}),
      ...(d.rentIsSplit !== undefined ? { rent_is_split: d.rentIsSplit } : {}),
      ...(d.mortgagePaymentCents !== undefined
        ? { mortgage_payment_cents: d.mortgagePaymentCents }
        : {}),
      ...(d.mortgagePaymentFrequency !== undefined
        ? { mortgage_payment_frequency: d.mortgagePaymentFrequency }
        : {}),
    })
    .eq("id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/");
  return { success: true };
}

export async function completeOnboarding() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("profiles")
    .update({ onboarding_completed: true })
    .eq("id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/");
  return { success: true };
}

/** Re-open onboarding so living costs / profile can be updated. */
export async function reopenOnboarding() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("profiles")
    .update({ onboarding_completed: false })
    .eq("id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/");
  return { success: true };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/");
}

const categoryUpdateSchema = z.object({
  transactionId: z.string().uuid(),
  category: z.string(),
  createMerchantRule: z.boolean().optional(),
  merchantPattern: z.string().optional(),
});

export async function updateTransactionCategory(
  data: z.infer<typeof categoryUpdateSchema>
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const parsed = categoryUpdateSchema.safeParse(data);
  if (!parsed.success) return { error: "Invalid data" };

  const { error } = await supabase
    .from("transactions")
    .update({
      category: parsed.data.category,
      confidence_score: 1,
      transaction_type: "expense",
    })
    .eq("id", parsed.data.transactionId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  if (parsed.data.createMerchantRule && parsed.data.merchantPattern) {
    await supabase.from("merchant_rules").upsert(
      {
        user_id: user.id,
        merchant_pattern: parsed.data.merchantPattern.toLowerCase(),
        category: parsed.data.category,
      },
      { onConflict: "user_id,merchant_pattern" }
    );
  }

  revalidatePath("/activity");
  revalidatePath("/activity/review");
  revalidatePath("/home");
  return { success: true };
}
