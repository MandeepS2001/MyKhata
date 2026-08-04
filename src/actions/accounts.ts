"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { accountTypeFromPurpose, type AccountPurpose } from "@/domain/services/money-position.service";

const accountSchema = z.object({
  name: z.string().trim().min(1).max(80),
  purpose: z.enum([
    "daily_spending",
    "savings",
    "protected_savings",
    "credit_card",
    "cash",
    "investment",
    "loan",
    "bnpl",
    "other",
  ]),
  institutionLabel: z.string().trim().max(80).optional(),
});

export async function createAccount(input: {
  name: string;
  purpose: AccountPurpose;
  institutionLabel?: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const parsed = accountSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Enter an account name and type." };
  }

  const { name, purpose, institutionLabel } = parsed.data;
  const { accountType, isProtected, includedInSafeToSpend } =
    accountTypeFromPurpose(purpose);

  const { data, error } = await supabase
    .from("accounts")
    .insert({
      user_id: user.id,
      name,
      account_type: accountType,
      institution_label: institutionLabel || null,
      data_source: "manual",
      connection_status: "disconnected",
      included_in_safe_to_spend: includedInSafeToSpend,
      is_protected: isProtected,
      include_in_net_worth: accountType !== "credit_card" && accountType !== "loan",
    })
    .select("id, name")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Could not create account." };
  }

  revalidatePath("/import");
  revalidatePath("/home");
  revalidatePath("/activity/add");
  return { success: true as const, account: data };
}
