"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { dollarsToCents } from "@/lib/currency";
import { prepareManualEntry } from "@/domain/services/ingestion.service";
import type { MerchantRule, TransactionType } from "@/domain/models";
import { applyTransactionToBalances } from "@/lib/accounts/balance";
import { mapAccountRow } from "@/lib/data/mappers";

const entrySchema = z.object({
  moneyDirection: z.enum(["spent", "received", "moved"]),
  amountDollars: z.union([z.number(), z.string()]),
  accountId: z.string().uuid(),
  counterpartyAccountId: z.string().uuid().optional().nullable(),
  description: z.string().trim().min(1).max(200),
  category: z.string().trim().min(1).max(60).optional().nullable(),
  transactionDate: z.string().min(8).max(12),
  notes: z.string().trim().max(500).optional().nullable(),
  behaviourOverride: z.string().optional().nullable(),
  isRecurring: z.boolean().optional(),
});

export async function createManualTransaction(input: z.infer<typeof entrySchema>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const parsed = entrySchema.safeParse(input);
  if (!parsed.success) return { error: "Check the amount, account, and description." };

  const amountCents = dollarsToCents(parsed.data.amountDollars);
  if (amountCents <= 0) return { error: "Amount must be greater than zero." };

  if (
    parsed.data.moneyDirection === "moved" &&
    !parsed.data.counterpartyAccountId
  ) {
    return { error: "Choose where the money moved to." };
  }

  if (
    parsed.data.moneyDirection === "moved" &&
    parsed.data.counterpartyAccountId === parsed.data.accountId
  ) {
    return { error: "Pick two different accounts." };
  }

  const { data: accountRows, error: accountError } = await supabase
    .from("accounts")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_archived", false);

  if (accountError) return { error: accountError.message };
  const accounts = (accountRows ?? []).map(mapAccountRow);

  const { data: ruleRows } = await supabase
    .from("merchant_rules")
    .select("*")
    .eq("user_id", user.id);

  const merchantRules: MerchantRule[] = (ruleRows ?? []).map((r) => ({
    id: r.id,
    userId: r.user_id,
    merchantPattern: r.merchant_pattern,
    category: r.category,
    subcategory: r.subcategory,
    transactionType: r.transaction_type,
  }));

  let legs;
  try {
    legs = prepareManualEntry({
      draft: {
        accountId: parsed.data.accountId,
        counterpartyAccountId: parsed.data.counterpartyAccountId,
        moneyDirection: parsed.data.moneyDirection,
        amountCents,
        description: parsed.data.description,
        transactionDate: parsed.data.transactionDate,
        notes: parsed.data.notes,
        categoryOverride: parsed.data.category,
        behaviourOverride: parsed.data.behaviourOverride as TransactionType | null,
        source: "manual",
      },
      accounts,
      merchantRules,
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not prepare transaction." };
  }

  const inserts = legs.map((leg) => ({
    user_id: user.id,
    account_id: leg.accountId,
    transaction_date: parsed.data.transactionDate,
    description: leg.description,
    normalised_merchant: leg.normalisedMerchant,
    amount_cents: leg.amountCents,
    direction: leg.direction,
    category: leg.category,
    confidence_score: leg.categoryConfidence,
    transaction_type: leg.transactionType,
    notes: leg.notes,
    source: "manual",
    provider_transaction_id: leg.providerTransactionId,
    raw_metadata: {
      ...leg.rawMetadata,
      transfer_group_id: leg.transferGroupId,
      behaviour_confidence: leg.behaviourConfidence,
      is_recurring_intent: parsed.data.isRecurring ?? false,
    },
    transfer_match_id: leg.transferGroupId,
  }));

  const { data: created, error: insertError } = await supabase
    .from("transactions")
    .insert(inserts)
    .select("id");

  if (insertError) return { error: insertError.message };

  // Update account balances
  for (const leg of legs) {
    const account = accounts.find((a) => a.id === leg.accountId);
    if (!account) continue;
    const next = applyTransactionToBalances(account, leg.amountCents);
    await supabase
      .from("accounts")
      .update({
        current_balance_cents: next.currentBalanceCents,
        available_balance_cents: next.availableBalanceCents,
      })
      .eq("id", account.id)
      .eq("user_id", user.id);
  }

  // Persist merchant preference when user set a category
  if (parsed.data.category && parsed.data.description) {
    const pattern = parsed.data.description.toLowerCase().slice(0, 40);
    await supabase.from("merchant_rules").upsert(
      {
        user_id: user.id,
        merchant_pattern: pattern,
        category: parsed.data.category,
        transaction_type: legs[0]?.transactionType ?? null,
      },
      { onConflict: "user_id,merchant_pattern" }
    );
  }

  revalidatePath("/home");
  revalidatePath("/activity");
  revalidatePath("/plan");
  return {
    success: true as const,
    ids: (created ?? []).map((r) => r.id),
    behaviour: (legs[0]?.rawMetadata as { behaviour?: string })?.behaviour,
  };
}

export async function suggestCategoryForMerchant(description: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { category: null as string | null };

  const pattern = description.toLowerCase().trim();
  if (!pattern) return { category: null };

  const { data: rules } = await supabase
    .from("merchant_rules")
    .select("category, merchant_pattern")
    .eq("user_id", user.id);

  const hit = (rules ?? []).find((r) =>
    pattern.includes(String(r.merchant_pattern).toLowerCase())
  );
  if (hit) return { category: hit.category as string };

  const { data: past } = await supabase
    .from("transactions")
    .select("category, normalised_merchant, description")
    .eq("user_id", user.id)
    .ilike("description", `%${pattern.slice(0, 20)}%`)
    .limit(5);

  const categories = (past ?? [])
    .map((t) => t.category as string)
    .filter((c) => c && c !== "other" && c !== "unknown");
  return { category: categories[0] ?? null };
}
