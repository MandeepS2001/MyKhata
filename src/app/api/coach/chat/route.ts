import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDashboardData } from "@/lib/data/dashboard";
import { formatCents } from "@/lib/currency";
import { coachSystemPrompt } from "@/lib/ai/coach";
import { generateCoachChat } from "@/lib/ai/openai";
import { z } from "zod";

const bodySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(4000),
      })
    )
    .min(1)
    .max(40),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid messages payload" }, { status: 400 });
  }

  const data = await getDashboardData();
  if (!data) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const { data: recentTxns } = await supabase
    .from("transactions")
    .select(
      "transaction_date, description, normalised_merchant, amount_cents, direction, category"
    )
    .eq("user_id", user.id)
    .order("transaction_date", { ascending: false })
    .limit(25);

  const financeContext = {
    safeToSpend: formatCents(data.safeToSpend.safeToSpendCents),
    daysUntilPayday: data.safeToSpend.daysUntilPayday,
    upcomingBills: formatCents(data.upcomingBillsCents),
    accounts: data.accounts.map((a) => ({
      name: a.name,
      type: a.accountType,
      available: formatCents(a.availableBalanceCents),
    })),
    recentTransactions: (recentTxns ?? []).map((t) => ({
      date: t.transaction_date,
      merchant: t.normalised_merchant ?? t.description,
      amount: formatCents(t.amount_cents as number),
      direction: t.direction,
      category: t.category,
    })),
    goals: (data.goals as Record<string, unknown>[]).map((g) => ({
      name: g.name,
      current: formatCents(g.current_amount_cents as number),
      target: formatCents(g.target_amount_cents as number),
    })),
  };

  const system = [
    coachSystemPrompt(data.profile.financialTone),
    "Finance context (facts only — do not invent numbers outside this):",
    JSON.stringify(financeContext),
  ].join("\n\n");

  // Drop the static welcome if present so the model focuses on the dialogue
  const chatMessages = parsed.data.messages
    .filter((m, i) => !(i === 0 && m.role === "assistant"))
    .slice(-20);

  const reply = await generateCoachChat({
    system,
    messages: chatMessages,
  });

  if (!reply) {
    const fallback = [
      `Your safe-to-spend is ${formatCents(data.safeToSpend.safeToSpendCents)} with ${data.safeToSpend.daysUntilPayday} days until payday.`,
      data.upcomingBillsCents > 0
        ? `${formatCents(data.upcomingBillsCents)} is reserved for upcoming bills.`
        : null,
      "AI coach copy is offline — ask again after OPENAI_API_KEY is set, or check Afford / Goals for numbers.",
    ]
      .filter(Boolean)
      .join(" ");

    return NextResponse.json({ reply: fallback });
  }

  return NextResponse.json({ reply });
}
