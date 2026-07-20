"use server";

import { createClient } from "@/lib/supabase/server";
import {
  DEMO_PROFILE,
  DEMO_ACCOUNTS,
  DEMO_GOALS,
  DEMO_WISHLIST,
  DEMO_INSIGHTS,
  generateDemoTransactions,
} from "@/lib/demo/seed-data";
import { revalidatePath } from "next/cache";

export async function seedDemoData() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // Update profile
  const nextPayday = new Date();
  nextPayday.setDate(15);
  if (nextPayday < new Date()) {
    nextPayday.setMonth(nextPayday.getMonth() + 1);
  }

  await supabase
    .from("profiles")
    .update({
      ...DEMO_PROFILE,
      next_payday: nextPayday.toISOString().split("T")[0],
      onboarding_completed: true,
      is_demo: true,
    })
    .eq("id", user.id);

  // Clear existing demo data
  await supabase.from("transactions").delete().eq("user_id", user.id);
  await supabase.from("accounts").delete().eq("user_id", user.id);
  await supabase.from("goals").delete().eq("user_id", user.id);
  await supabase.from("wishlist_items").delete().eq("user_id", user.id);
  await supabase.from("insights").delete().eq("user_id", user.id);

  // Create accounts
  const accountIds: string[] = [];
  for (const account of DEMO_ACCOUNTS) {
    const { data, error } = await supabase
      .from("accounts")
      .insert({
        user_id: user.id,
        ...account,
        name: account.name,
        account_type: account.accountType,
        institution_label: account.institutionLabel,
        masked_identifier: account.maskedIdentifier,
        current_balance_cents: account.currentBalanceCents,
        available_balance_cents: account.availableBalanceCents,
        credit_limit_cents: "creditLimitCents" in account ? account.creditLimitCents : null,
        included_in_safe_to_spend: account.includedInSafeToSpend,
        is_protected: account.isProtected,
        data_source: account.dataSource,
      })
      .select("id")
      .single();

    if (error) return { error: error.message };
    accountIds.push(data.id);
  }

  // Create transactions
  const demoTxns = generateDemoTransactions();
  const txnInserts = demoTxns.map((t) => ({
    user_id: user.id,
    account_id: accountIds[t.accountIndex]!,
    transaction_date: t.transactionDate,
    description: t.description,
    normalised_merchant: t.description.split(" ").slice(0, 3).join(" "),
    amount_cents: t.amountCents,
    direction: t.direction,
    category: t.category,
    transaction_type: t.transactionType,
    confidence_score: 0.9,
    source: "mock" as const,
  }));

  await supabase.from("transactions").insert(txnInserts);

  // Create goals
  for (const goal of DEMO_GOALS) {
    await supabase.from("goals").insert({
      user_id: user.id,
      name: goal.name,
      target_amount_cents: goal.targetAmountCents,
      current_amount_cents: goal.currentAmountCents,
      priority: goal.priority,
      category: goal.category,
      icon: goal.icon,
    });
  }

  // Create wishlist
  for (const item of DEMO_WISHLIST) {
    await supabase.from("wishlist_items").insert({
      user_id: user.id,
      name: item.name,
      price_cents: item.priceCents,
      category: item.category,
      priority: item.priority,
      status: "thinking",
    });
  }

  // Create insights
  for (const insight of DEMO_INSIGHTS) {
    await supabase.from("insights").insert({
      user_id: user.id,
      insight_type: insight.insightType,
      title: insight.title,
      message: insight.message,
      severity: insight.severity,
      tone: DEMO_PROFILE.financialTone,
    });
  }

  await supabase.from("audit_events").insert({
    user_id: user.id,
    event_type: "demo_data_seeded",
    metadata: { accountCount: accountIds.length, transactionCount: demoTxns.length },
  });

  revalidatePath("/home");
  return { success: true };
}
