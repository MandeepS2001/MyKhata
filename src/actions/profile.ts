"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const profileSchema = z.object({
  displayName: z.string().min(1).max(100),
  currency: z.string().default("AUD"),
  paydayFrequency: z.enum(["weekly", "fortnightly", "monthly", "irregular"]),
  nextPayday: z.string().optional(),
  incomeType: z.enum(["hourly", "salary", "variable", "mixed"]),
  incomeCents: z.number().optional(),
  financialTone: z.enum(["direct", "blunt", "roast"]),
});

export async function updateProfile(data: z.infer<typeof profileSchema>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const parsed = profileSchema.safeParse(data);
  if (!parsed.success) return { error: "Invalid profile data" };

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: parsed.data.displayName,
      currency: parsed.data.currency,
      payday_frequency: parsed.data.paydayFrequency,
      next_payday: parsed.data.nextPayday,
      income_type: parsed.data.incomeType,
      income_cents: parsed.data.incomeCents,
      financial_tone: parsed.data.financialTone,
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
  revalidatePath("/home");
  return { success: true };
}
