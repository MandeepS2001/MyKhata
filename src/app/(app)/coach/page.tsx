"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

type ChatMessage = { role: "user" | "assistant"; content: string };

export default function CoachPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Ask me about safe-to-spend, bills, goals, or a purchase you're considering. I explain using your numbers — I don't invent them.",
    },
  ]);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || pending) return;

    const nextMessages: ChatMessage[] = [
      ...messages,
      { role: "user", content: text },
    ];
    setMessages(nextMessages);
    setInput("");
    setError(null);

    startTransition(async () => {
      try {
        const res = await fetch("/api/coach/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: nextMessages.filter(
              (m) => m.role === "user" || m.role === "assistant"
            ),
          }),
        });
        const data = (await res.json()) as {
          reply?: string;
          error?: string;
        };
        if (!res.ok || data.error) {
          setError(data.error ?? "Coach is unavailable right now.");
          return;
        }
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.reply ?? "No reply." },
        ]);
      } catch {
        setError("Could not reach the coach. Try again.");
      }
    });
  }

  return (
    <AppShell>
      <div className="flex min-h-[calc(100dvh-var(--bottom-nav-height)-env(safe-area-inset-bottom)-3.5rem)] flex-col gap-4">
        <div>
          <p className="text-sm font-bold text-[#ffb84d]">Khata</p>
          <h1 className="font-display mt-1 text-3xl font-semibold tracking-tight">
            Ask anything money
          </h1>
          <p className="mt-1 text-sm text-[#9a9186]">
            Grounded in your accounts, transactions, and safe-to-spend.
          </p>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto">
          {messages.map((m, i) => (
            <Card
              key={`${m.role}-${i}`}
              className={
                m.role === "user"
                  ? "border-[#ffb84d]/20 bg-[#ffb84d]/8"
                  : undefined
              }
            >
              <CardContent className="p-4">
                <p className="mb-1 text-xs font-bold uppercase tracking-wide text-[#9a9186]">
                  {m.role === "user" ? "You" : "MyKhata"}
                </p>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#f7f1e8]">
                  {m.content}
                </p>
              </CardContent>
            </Card>
          ))}
          <div ref={bottomRef} />
        </div>

        {error && (
          <p className="text-sm text-red-400" role="alert">
            {error}
          </p>
        )}

        <form onSubmit={handleSend} className="flex gap-2 pb-1">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Can I afford dinner out this week?"
            disabled={pending}
            className="flex-1"
          />
          <Button type="submit" disabled={pending || !input.trim()}>
            {pending ? "…" : "Send"}
          </Button>
        </form>
      </div>
    </AppShell>
  );
}
