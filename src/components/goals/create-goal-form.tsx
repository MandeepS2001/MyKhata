"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createGoal } from "@/actions/goals";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { dollarsToCents } from "@/lib/currency";

export function CreateGoalForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await createGoal({
        name,
        targetAmountCents: dollarsToCents(Number(target)),
        targetDate: targetDate || undefined,
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
    <Card>
      <CardContent className="p-5">
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Goal</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Emergency fund"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="target">Target amount (AUD)</Label>
            <Input
              id="target"
              type="number"
              min="1"
              step="0.01"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="5000"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="date">Target date (optional)</Label>
            <Input
              id="date"
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Saving..." : "Create goal"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
