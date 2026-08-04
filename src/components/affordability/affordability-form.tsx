"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { checkAffordability } from "@/actions/affordability";
import { createWishlistItem } from "@/actions/wishlist";
import { verdictToWishlistStatus } from "@/lib/wishlist/status";
import type { EnhancedAffordabilityResult } from "@/domain/services/affordability.service";
import { formatCents } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

const TONE_STYLES: Record<
  "green" | "amber" | "red",
  { border: string; bg: string; text: string; icon: typeof CheckCircle2 }
> = {
  green: {
    border: "border-emerald-500/30",
    bg: "bg-emerald-950/20",
    text: "text-emerald-400",
    icon: CheckCircle2,
  },
  amber: {
    border: "border-amber-500/30",
    bg: "bg-amber-950/20",
    text: "text-amber-400",
    icon: AlertTriangle,
  },
  red: {
    border: "border-red-500/30",
    bg: "bg-red-950/20",
    text: "text-red-400",
    icon: XCircle,
  },
};

export function AffordabilityForm() {
  const router = useRouter();
  const [productName, setProductName] = useState("");
  const [priceDollars, setPriceDollars] = useState("");
  const [productUrl, setProductUrl] = useState("");
  const [desiredPurchaseDate, setDesiredPurchaseDate] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "credit_card">("cash");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [narrative, setNarrative] = useState<string | null>(null);
  const [result, setResult] = useState<EnhancedAffordabilityResult | null>(null);
  const [checkedPriceCents, setCheckedPriceCents] = useState<number | null>(null);
  const [wishlistMessage, setWishlistMessage] = useState<string | null>(null);

  function handleCheck(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setWishlistMessage(null);
    startTransition(async () => {
      const res = await checkAffordability({
        productName,
        priceDollars,
        productUrl: productUrl || undefined,
        desiredPurchaseDate: desiredPurchaseDate || undefined,
        paymentMethod,
      });
      if ("error" in res && res.error) {
        setError(res.error);
        setResult(null);
        setNarrative(null);
        return;
      }
      if ("success" in res && res.success) {
        setResult(res.result);
        setNarrative(res.narrative);
        setCheckedPriceCents(res.priceCents);
      }
    });
  }

  function handleAddToWishlist() {
    if (!result || checkedPriceCents == null) return;
    setWishlistMessage(null);
    startTransition(async () => {
      const res = await createWishlistItem({
        name: productName.trim(),
        priceCents: checkedPriceCents,
        productUrl: productUrl || undefined,
        desiredPurchaseDate: desiredPurchaseDate || undefined,
        status: verdictToWishlistStatus(result.verdict),
        lastVerdict: result.verdict,
      });
      if ("error" in res && res.error) {
        setError(res.error);
        return;
      }
      setWishlistMessage("Added to wishlist.");
      router.refresh();
    });
  }

  const tone = result ? TONE_STYLES[result.tone] : null;
  const ToneIcon = tone?.icon;

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Check a purchase</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCheck} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="product-name">Product name</Label>
              <Input
                id="product-name"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="Sony WH-1000XM5"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">Price (AUD)</Label>
              <Input
                id="price"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0.01"
                value={priceDollars}
                onChange={(e) => setPriceDollars(e.target.value)}
                placeholder="449.00"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Paying with</Label>
              <div className="grid grid-cols-2 gap-2">
                {(["cash", "credit_card"] as const).map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setPaymentMethod(method)}
                    className={cn(
                      "rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors",
                      paymentMethod === method
                        ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                        : "border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                    )}
                  >
                    {method === "cash" ? "Cash / debit" : "Credit card"}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="product-url">Product URL (optional)</Label>
              <Input
                id="product-url"
                type="url"
                value={productUrl}
                onChange={(e) => setProductUrl(e.target.value)}
                placeholder="https://…"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="desired-date">Desired purchase date (optional)</Label>
              <Input
                id="desired-date"
                type="date"
                value={desiredPurchaseDate}
                onChange={(e) => setDesiredPurchaseDate(e.target.value)}
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
              disabled={pending || !productName.trim() || !priceDollars}
            >
              {pending ? "Checking…" : "Can I afford this?"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {result && narrative && tone && ToneIcon && (
        <Card className={cn("border", tone.border, tone.bg)}>
          <CardContent className="space-y-4 p-5">
            <div className="flex items-center justify-between gap-3">
              <span className={cn("flex items-center gap-1.5 text-sm font-semibold", tone.text)}>
                <ToneIcon className="h-4 w-4" />
                {result.headline}
              </span>
              {checkedPriceCents != null && (
                <span className="text-sm font-semibold text-zinc-200">
                  {formatCents(checkedPriceCents)}
                </span>
              )}
            </div>

            <p className="text-sm leading-relaxed text-zinc-200">{narrative}</p>

            {result.cardCanPayButFinancesCant && (
              <p className="rounded-lg bg-zinc-900/60 px-3 py-2 text-xs text-amber-300">
                Your card can pay for it. Your finances can’t.
              </p>
            )}

            <div className="grid grid-cols-2 gap-3 rounded-xl border border-zinc-800 bg-zinc-950/40 p-3 text-xs">
              <div>
                <p className="text-zinc-500">Safe to spend before</p>
                <p className="mt-0.5 font-semibold text-zinc-200">
                  {formatCents(result.impact.before.safeToSpendCents)}
                </p>
              </div>
              <div>
                <p className="text-zinc-500">Safe to spend after</p>
                <p
                  className={cn(
                    "mt-0.5 font-semibold",
                    result.impact.after.safeToSpendCents > 0
                      ? "text-zinc-200"
                      : "text-red-400"
                  )}
                >
                  {formatCents(result.impact.after.safeToSpendCents)}
                </p>
              </div>
              <div>
                <p className="text-zinc-500">Credit card owed before</p>
                <p className="mt-0.5 font-semibold text-zinc-200">
                  {formatCents(result.impact.before.creditCardOwedCents)}
                </p>
              </div>
              <div>
                <p className="text-zinc-500">Credit card owed after</p>
                <p className="mt-0.5 font-semibold text-zinc-200">
                  {formatCents(result.impact.after.creditCardOwedCents)}
                </p>
              </div>
            </div>

            <p className="text-xs text-zinc-500">{result.suggestedAction}</p>

            {result.suggestedWeeklySaveCents && (
              <p className="text-sm text-sky-400">
                Save about {formatCents(result.suggestedWeeklySaveCents)}/week to afford this
                {result.daysToAfford ? ` in roughly ${result.daysToAfford} days.` : "."}
              </p>
            )}

            <div className="flex flex-col gap-2 pt-1">
              {result.earliestSafeDate && (
                <p className="text-sm text-sky-400">
                  Wait until payday ({result.earliestSafeDate}).
                </p>
              )}
              {result.goalDelays.length > 0 && (
                <p className="text-xs text-zinc-500">
                  Would delay “{result.goalDelays[0]?.goalName}” by about{" "}
                  {result.goalDelays[0]?.delayDays} days.
                </p>
              )}
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                disabled={pending}
                onClick={handleAddToWishlist}
              >
                Add to Wishlist
              </Button>
              {wishlistMessage && (
                <p className="text-sm text-emerald-400">{wishlistMessage}</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
