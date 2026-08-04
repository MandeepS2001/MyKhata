"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createManualTransaction, suggestCategoryForMerchant } from "@/actions/transactions";
import { accountPurpose, purposeLabel } from "@/domain/services/money-position.service";
import type { Account } from "@/domain/models";
import { TRANSACTION_CATEGORIES } from "@/domain/models";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ArrowDownCircle, ArrowUpCircle, ArrowLeftRight } from "lucide-react";

type MoneyDirection = "spent" | "received" | "moved";

interface AddTransactionFormProps {
  accounts: Account[];
  initialMode?: MoneyDirection;
}

const DIRECTIONS: Array<{
  value: MoneyDirection;
  label: string;
  icon: typeof ArrowDownCircle;
  activeClass: string;
}> = [
  {
    value: "spent",
    label: "Spent",
    icon: ArrowDownCircle,
    activeClass: "border-red-500 bg-red-500/10 text-red-400",
  },
  {
    value: "received",
    label: "Received",
    icon: ArrowUpCircle,
    activeClass: "border-emerald-500 bg-emerald-500/10 text-emerald-400",
  },
  {
    value: "moved",
    label: "Moved",
    icon: ArrowLeftRight,
    activeClass: "border-sky-500 bg-sky-500/10 text-sky-400",
  },
];

function todayIso(): string {
  return new Date().toISOString().split("T")[0]!;
}

function accountOptionLabel(account: Account): string {
  return `${account.name} · ${purposeLabel(accountPurpose(account))}`;
}

export function AddTransactionForm({ accounts, initialMode }: AddTransactionFormProps) {
  const router = useRouter();
  const [direction, setDirection] = useState<MoneyDirection>(initialMode ?? "spent");
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [counterpartyAccountId, setCounterpartyAccountId] = useState(
    accounts[1]?.id ?? accounts[0]?.id ?? ""
  );
  const [amountDollars, setAmountDollars] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>("");
  const [categoryTouched, setCategoryTouched] = useState(false);
  const [transactionDate, setTransactionDate] = useState(todayIso());
  const [notes, setNotes] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [suggestPending, startSuggestTransition] = useTransition();

  const otherAccounts = useMemo(
    () => accounts.filter((a) => a.id !== accountId),
    [accounts, accountId]
  );

  function handleDescriptionBlur() {
    if (direction === "moved") return;
    if (!description.trim() || categoryTouched) return;
    startSuggestTransition(async () => {
      const res = await suggestCategoryForMerchant(description.trim());
      if (res.category) setCategory(res.category);
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!amountDollars || Number(amountDollars) <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }
    if (!description.trim()) {
      setError("Add a short description.");
      return;
    }
    if (direction === "moved" && counterpartyAccountId === accountId) {
      setError("Pick two different accounts.");
      return;
    }

    startTransition(async () => {
      const res = await createManualTransaction({
        moneyDirection: direction,
        amountDollars,
        accountId,
        counterpartyAccountId: direction === "moved" ? counterpartyAccountId : null,
        description: description.trim(),
        category: direction === "moved" ? null : category || null,
        transactionDate,
        notes: notes.trim() || null,
        isRecurring,
      });

      if ("error" in res && res.error) {
        setError(res.error);
        return;
      }

      router.push("/activity");
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-2">
        {DIRECTIONS.map(({ value, label, icon: Icon, activeClass }) => (
          <button
            key={value}
            type="button"
            onClick={() => setDirection(value)}
            className={cn(
              "flex flex-col items-center gap-1.5 rounded-xl border border-zinc-700 py-3 text-sm font-medium text-zinc-300 transition-colors",
              direction === value ? activeClass : "hover:bg-zinc-800"
            )}
          >
            <Icon className="h-5 w-5" />
            {label}
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="p-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (AUD)</Label>
              <Input
                id="amount"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0.01"
                value={amountDollars}
                onChange={(e) => setAmountDollars(e.target.value)}
                placeholder="0.00"
                required
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">
                {direction === "moved" ? "What is this move for?" : "Description"}
              </Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={handleDescriptionBlur}
                placeholder={
                  direction === "spent"
                    ? "Woolworths, Uber Eats, …"
                    : direction === "received"
                      ? "Salary, refund, gift, …"
                      : "Savings top-up, CC payment, …"
                }
                required
              />
              {suggestPending && (
                <p className="text-xs text-zinc-500">Suggesting a category…</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="account">
                {direction === "received" ? "To account" : "From account"}
              </Label>
              <select
                id="account"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm"
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {accountOptionLabel(a)}
                  </option>
                ))}
              </select>
            </div>

            {direction === "moved" && (
              <div className="space-y-2">
                <Label htmlFor="counterparty">To account</Label>
                <select
                  id="counterparty"
                  value={counterpartyAccountId}
                  onChange={(e) => setCounterpartyAccountId(e.target.value)}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm"
                >
                  {otherAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {accountOptionLabel(a)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {direction !== "moved" && (
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <select
                  id="category"
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value);
                    setCategoryTouched(true);
                  }}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm capitalize"
                >
                  <option value="">Auto-detect</option>
                  {TRANSACTION_CATEGORIES.map((c) => (
                    <option key={c} value={c} className="capitalize">
                      {c.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={transactionDate}
                onChange={(e) => setTransactionDate(e.target.value)}
                max={todayIso()}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Input
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Anything worth remembering"
              />
            </div>

            {direction === "spent" && (
              <label className="flex items-center gap-2 text-sm text-zinc-400">
                <input
                  type="checkbox"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 accent-emerald-500"
                />
                This repeats regularly
              </label>
            )}

            {error && (
              <p className="text-sm text-red-400" role="alert">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Saving…" : "Save transaction"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
