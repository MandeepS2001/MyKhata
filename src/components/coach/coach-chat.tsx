"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "Can I afford a new phone?",
  "How much did I spend on Uber this year?",
  "What subscriptions can I cancel?",
  "How much should I save weekly for a motorcycle?",
];

export function CoachChat() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [pending, startTransition] = useTransition();

  function send(text: string) {
    const content = text.trim();
    if (!content) return;
    const nextMessages: Msg[] = [...messages, { role: "user", content }];
    setMessages(nextMessages);
    setInput("");

    startTransition(async () => {
      const res = await fetch("/api/coach/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
      });
      const data = (await res.json()) as { reply?: string; error?: string };
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.reply ?? data.error ?? "Something went wrong.",
        },
      ]);
    });
  }

  return (
    <div className="space-y-4">
      {messages.length === 0 && (
        <div className="flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => send(s)}
              className="rounded-full border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:border-emerald-500/50"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-3">
        {messages.map((m, i) => (
          <Card
            key={`${m.role}-${i}`}
            className={m.role === "assistant" ? "border-emerald-500/20" : undefined}
          >
            <CardContent className="p-4 text-sm leading-relaxed text-zinc-200">
              <p className="mb-1 text-[10px] uppercase tracking-wide text-zinc-500">
                {m.role === "assistant" ? "MyKhata" : "You"}
              </p>
              {m.content}
            </CardContent>
          </Card>
        ))}
      </div>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about your money…"
          disabled={pending}
        />
        <Button type="submit" disabled={pending || !input.trim()}>
          {pending ? "…" : "Ask"}
        </Button>
      </form>
    </div>
  );
}
