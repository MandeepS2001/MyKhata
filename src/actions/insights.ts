"use server";

import { createClient } from "@/lib/supabase/server";
import { insightService } from "@/domain/services/insight.service";
import { recurringPaymentService } from "@/domain/services/recurring.service";
import { mapTransactionRow } from "@/lib/data/mappers";
import { revalidatePath } from "next/cache";

export async function refreshInsights() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: rows } = await supabase
    .from("transactions")
    .select("*")
    .eq("user_id", user.id)
    .order("transaction_date", { ascending: false })
    .limit(400);

  const transactions = (rows ?? []).map((row) =>
    mapTransactionRow(row as Record<string, unknown>)
  );

  const insights = insightService.generate(transactions);

  await supabase
    .from("insights")
    .delete()
    .eq("user_id", user.id)
    .eq("is_dismissed", false);

  if (insights.length > 0) {
    await supabase.from("insights").insert(
      insights.map((i) => ({
        user_id: user.id,
        insight_type: i.insightType,
        title: i.title,
        message: i.message,
        severity: i.severity,
        evidence: i.evidence ?? {},
        suggested_action: i.suggestedAction ?? null,
      }))
    );
  }

  const recurring = recurringPaymentService.detect(transactions);
  await supabase.from("recurring_payments").delete().eq("user_id", user.id);
  if (recurring.length > 0) {
    await supabase.from("recurring_payments").insert(
      recurring.map((r) => ({
        user_id: user.id,
        merchant: r.merchant,
        amount_cents_min: r.amountCentsMin,
        amount_cents_max: r.amountCentsMax,
        frequency: r.frequency,
        next_expected_date: r.nextExpectedDate,
        category: r.category,
        is_essential: r.isEssential,
        is_active: true,
        confidence: r.confidence,
        price_history: [
          { amount_cents: r.typicalAmountCents, at: r.lastPaymentDate },
        ],
      }))
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("next_payday")
    .eq("id", user.id)
    .single();

  if (profile?.next_payday) {
    const days = Math.ceil(
      (new Date(profile.next_payday as string).getTime() - Date.now()) /
        (1000 * 60 * 60 * 24)
    );
    if (days >= 0 && days <= 2) {
      await supabase.from("notifications").insert({
        user_id: user.id,
        title: days === 0 ? "Payday is today" : "Payday soon",
        body:
          days === 0
            ? "Salary is expected today. Review safe to spend after it lands."
            : `Important bills may land before payday in ${days} day(s).`,
        notification_type: "payday",
      });
    }
  }

  revalidatePath("/home");
  revalidatePath("/subscriptions");
  return {
    success: true,
    insightCount: insights.length,
    recurringCount: recurring.length,
  };
}
