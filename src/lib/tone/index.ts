export type FinancialTone = "direct" | "blunt" | "roast";

export interface ToneMessage {
  direct: string;
  blunt: string;
  roast: string;
}

export function getToneMessage(
  messages: ToneMessage,
  tone: FinancialTone
): string {
  return messages[tone];
}

export const TONE_LABELS: Record<FinancialTone, string> = {
  direct: "Direct",
  blunt: "Blunt",
  roast: "Roast",
};

export const TONE_DESCRIPTIONS: Record<FinancialTone, string> = {
  direct: "Clear and firm. Minimal humour.",
  blunt: "Stronger language. Still respectful.",
  roast: "Playful wit. Never cruel.",
};
