"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const createGoalSchema = z.object({
  name: z.string().trim().min(1).max(120),
  targetAmountCents: z.number().int().positive(),
  targetDate: z.string().optional(),
  category: z.string().trim().max(80).optional(),
});

export async function createGoal(input: {
  name: string;
  targetAmountCents: number;
  targetDate?: string;
  category?: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const parsed = createGoalSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Enter a goal name and a positive target amount." };
  }

  const { name, targetAmountCents, targetDate, category } = parsed.data;

  const { data, error } = await supabase
    .from("goals")
    .insert({
      user_id: user.id,
      name,
      target_amount_cents: targetAmountCents,
      target_date: targetDate || null,
      category: category || null,
      priority: 0,
    })
    .select("id, name")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Could not create goal." };
  }

  revalidatePath("/goals");
  revalidatePath("/home");
  return { success: true as const, goal: data };
}

const contributeSchema = z.object({
  goalId: z.string().uuid(),
  amountCents: z.number().int().positive(),
});

/** Optional contribution helper for later UI wiring. */
export async function contributeToGoal(input: {
  goalId: string;
  amountCents: number;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const parsed = contributeSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Enter a valid contribution amount." };
  }

  const { goalId, amountCents } = parsed.data;

  const { data: goal, error: goalError } = await supabase
    .from("goals")
    .select("id, current_amount_cents")
    .eq("id", goalId)
    .eq("user_id", user.id)
    .single();

  if (goalError || !goal) {
    return { error: "Goal not found." };
  }

  const { error: contribError } = await supabase.from("goal_contributions").insert({
    goal_id: goalId,
    user_id: user.id,
    amount_cents: amountCents,
  });

  if (contribError) {
    return { error: contribError.message };
  }

  const { error: updateError } = await supabase
    .from("goals")
    .update({
      current_amount_cents: (goal.current_amount_cents as number) + amountCents,
    })
    .eq("id", goalId)
    .eq("user_id", user.id);

  if (updateError) {
    return { error: updateError.message };
  }

  revalidatePath("/goals");
  revalidatePath("/home");
  return { success: true as const };
}
