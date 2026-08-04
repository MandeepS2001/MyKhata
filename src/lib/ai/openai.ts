import OpenAI from "openai";

let client: OpenAI | null = null;

export function getOpenAI(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  if (!client) {
    client = new OpenAI({ apiKey });
  }
  return client;
}

export function isAiEnabled(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

/** Narrative copy only — never trust the model for money math. */
export async function generateCoachText(input: {
  system: string;
  user: string;
  temperature?: number;
}): Promise<string | null> {
  const openai = getOpenAI();
  if (!openai) return null;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: input.temperature ?? 0.4,
      max_tokens: 500,
      messages: [
        { role: "system", content: input.system },
        { role: "user", content: input.user },
      ],
    });
    return response.choices[0]?.message?.content?.trim() ?? null;
  } catch {
    return null;
  }
}

export async function generateCoachChat(input: {
  system: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
}): Promise<string | null> {
  const openai = getOpenAI();
  if (!openai) return null;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.3,
      max_tokens: 700,
      messages: [
        { role: "system", content: input.system },
        ...input.messages,
      ],
    });
    return response.choices[0]?.message?.content?.trim() ?? null;
  } catch {
    return null;
  }
}
