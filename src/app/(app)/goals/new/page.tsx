"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createGoal } from "@/actions/goals";
import { dollarsToCents } from "@/lib/currency";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default function NewGoalPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [targetDollars, setTargetDollars] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [category, setCategory] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const targetAmountCents = dollarsToCents(targetDollars);
    if (targetAmountCents <= 0) {
      setError("Enter a positive target amount.");
      return;
    }

    startTransition(async () => {
      const res = await createGoal({
        name,
        targetAmountCents,
        targetDate: targetDate || undefined,
        category: category || undefined,
      });
      if ("error" in res && res.error) {
        setError(res.error);
        return;
      }
      router.push("/goals");
      router.refresh();
    });
  }

  return (
    <AppShell>
      <div className="space-y-5">
        <Link href="/goals" className="text-sm text-emerald-400 hover:text-emerald-300">
          ← Goals
        </Link>
        <h1 className="text-2xl font-bold">New goal</h1>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Give this money a job</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="goal-name">Name</Label>
                <Input
                  id="goal-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Emergency buffer"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="goal-target">Target amount (AUD)</Label>
                <Input
                  id="goal-target"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0.01"
                  value={targetDollars}
                  onChange={(e) => setTargetDollars(e.target.value)}
                  placeholder="5000.00"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="goal-date">Target date (optional)</Label>
                <Input
                  id="goal-date"
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="goal-category">Category (optional)</Label>
                <Input
                  id="goal-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="savings, travel, …"
                />
              </div>
              {error && (
                <p className="text-sm text-red-400" role="alert">
                  {error}
                </p>
              )}
              <Button
                type="submit"
                className="w-full"
                disabled={pending || !name.trim() || !targetDollars}
              >
                {pending ? "Creating…" : "Create goal"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
