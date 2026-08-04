import type { FinancialTone } from "@/lib/tone";
import { formatCents } from "@/lib/currency";
import { generateCoachText } from "@/lib/ai/openai";

const TONE_INSTRUCTIONS: Record<FinancialTone, string> = {
  direct: "Be clear, calm, and firm. Minimal humour.",
  blunt: "Be stronger and more direct, still respectful.",
  roast: "Be playfully witty, never cruel or shaming.",
};

export function coachSystemPrompt(tone: FinancialTone): string {
  return [
    "You are MyKhata, an Australian personal finance co-pilot.",
    "You explain money decisions using the structured facts provided.",
    "Never invent balances, dates, or amounts. Never do arithmetic yourself — use only provided numbers.",
    "Currency is AUD. Dates use Australian conventions.",
    "Always answer: what happened, what is likely next, and what to do now.",
    "Never shame the user.",
    TONE_INSTRUCTIONS[tone],
  ].join(" ");
}

export async function narrateAffordability(input: {
  tone: FinancialTone;
  productName: string;
  priceCents: number;
  verdict: string;
  explanation: string;
  suggestedAction: string;
  cashAfterPurchaseCents: number;
  safeToSpendCents: number;
  daysUntilPayday: number;
}): Promise<string> {
  const fallback = `${input.explanation} ${input.suggestedAction}`.trim();

  const ai = await generateCoachText({
    system: coachSystemPrompt(input.tone),
    user: JSON.stringify({
      task: "Write a short affordability answer (2-4 sentences) plus one concrete next step.",
      productName: input.productName,
      price: formatCents(input.priceCents),
      verdict: input.verdict,
      explanation: input.explanation,
      suggestedAction: input.suggestedAction,
      cashAfterPurchase: formatCents(input.cashAfterPurchaseCents, { showSign: true }),
      safeToSpend: formatCents(input.safeToSpendCents),
      daysUntilPayday: input.daysUntilPayday,
    }),
  });

  return ai ?? fallback;
}

export async function narrateHomeSummary(input: {
  tone: FinancialTone;
  displayName: string | null;
  safeToSpendCents: number;
  daysUntilPayday: number;
  creditCardDebtCents: number;
  upcomingBillsCents: number;
  topCategories: Array<{ category: string; amountCents: number }>;
  uncertainCount: number;
}): Promise<string> {
  const fallbackParts = [
    input.safeToSpendCents > 0
      ? `You can safely use ${formatCents(input.safeToSpendCents)} before payday.`
      : "Safe to spend is currently $0 — obligations are covering available cash.",
  ];
  if (input.upcomingBillsCents > 0) {
    fallbackParts.push(
      `${formatCents(input.upcomingBillsCents)} in bills is already reserved.`
    );
  }
  if (input.uncertainCount > 0) {
    fallbackParts.push(`${input.uncertainCount} transactions still need your help.`);
  }
  const fallback = fallbackParts.join(" ");

  const ai = await generateCoachText({
    system: coachSystemPrompt(input.tone),
    user: JSON.stringify({
      task: "Write a 2-3 sentence home summary: what matters now and what to do next.",
      name: input.displayName ?? "there",
      safeToSpend: formatCents(input.safeToSpendCents),
      daysUntilPayday: input.daysUntilPayday,
      creditCardDebt: formatCents(input.creditCardDebtCents),
      upcomingBills: formatCents(input.upcomingBillsCents),
      topCategories: input.topCategories.map((c) => ({
        category: c.category,
        amount: formatCents(c.amountCents),
      })),
      uncertainCount: input.uncertainCount,
    }),
  });

  return ai ?? fallback;
}

export async function narrateWeeklyReport(input: {
  tone: FinancialTone;
  weekSpendByCategory: Array<{ category: string; amountCents: number }>;
  totalSpendCents: number;
}): Promise<string> {
  const top = input.weekSpendByCategory[0];
  const yearly =
    top && top.amountCents > 0
      ? formatCents(top.amountCents * 52)
      : null;
  const fallback = top
    ? `This week you spent ${formatCents(input.totalSpendCents)}. ${top.category} led at ${formatCents(top.amountCents)}${yearly ? ` — at that pace, about ${yearly} a year` : ""}.`
    : `This week you spent ${formatCents(input.totalSpendCents)}.`;

  const ai = await generateCoachText({
    system: coachSystemPrompt(input.tone),
    user: JSON.stringify({
      task: "Write a calm weekly money-leak summary with one opportunity. No shame.",
      totalSpend: formatCents(input.totalSpendCents),
      categories: input.weekSpendByCategory.map((c) => ({
        category: c.category,
        amount: formatCents(c.amountCents),
      })),
    }),
  });

  return ai ?? fallback;
}
