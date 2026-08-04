"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createAccount } from "@/actions/accounts";
import { seedDemoData } from "@/actions/demo";
import type { AccountPurpose } from "@/domain/services/money-position.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const ACCOUNT_PURPOSES: Array<{ value: AccountPurpose; label: string; hint: string }> = [
  { value: "daily_spending", label: "Daily spending", hint: "Everyday account" },
  { value: "savings", label: "Savings", hint: "Flexible savings" },
  { value: "protected_savings", label: "Protected savings", hint: "Never counted as free cash" },
  { value: "credit_card", label: "Credit card", hint: "Owed balance, never wealth" },
  { value: "cash", label: "Cash", hint: "Physical wallet" },
];

export function CreateAccountForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [institutionLabel, setInstitutionLabel] = useState("");
  const [purpose, setPurpose] = useState<AccountPurpose>("daily_spending");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await createAccount({
        name,
        purpose,
        institutionLabel: institutionLabel || undefined,
      });
      if ("error" in res && res.error) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  function handleDemo() {
    setError(null);
    startTransition(async () => {
      const res = await seedDemoData();
      if (res && "error" in res && res.error) {
        setError(res.error);
        return;
      }
      router.push("/home");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Add an account</CardTitle>
          <CardDescription>
            Tell us what this money is for — MyKhata treats each purpose differently.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="account-name">Account name</Label>
              <Input
                id="account-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Everyday spending"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="institution">Bank</Label>
              <Input
                id="institution"
                value={institutionLabel}
                onChange={(e) => setInstitutionLabel(e.target.value)}
                placeholder="CommBank, Westpac, …"
              />
            </div>
            <div className="space-y-2">
              <Label>What is this money for?</Label>
              <div className="grid grid-cols-1 gap-2">
                {ACCOUNT_PURPOSES.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setPurpose(p.value)}
                    className={`flex flex-col items-start rounded-xl border px-4 py-2.5 text-left transition-colors ${
                      purpose === p.value
                        ? "border-emerald-500 bg-emerald-500/10"
                        : "border-zinc-700 hover:bg-zinc-800"
                    }`}
                  >
                    <span
                      className={`text-sm font-medium ${
                        purpose === p.value ? "text-emerald-400" : "text-zinc-200"
                      }`}
                    >
                      {p.label}
                    </span>
                    <span className="text-xs text-zinc-500">{p.hint}</span>
                  </button>
                ))}
              </div>
            </div>
            {error && (
              <p className="text-sm text-red-400" role="alert">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={pending || !name.trim()}>
              {pending ? "Creating..." : "Create account"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Button
        type="button"
        variant="outline"
        className="w-full"
        disabled={pending}
        onClick={handleDemo}
      >
        Or load demo data instead
      </Button>
    </div>
  );
}
