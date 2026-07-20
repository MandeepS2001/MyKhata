import { formatCents } from "@/lib/currency";
import type { SafeToSpendResult } from "@/domain/models";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Info, Shield } from "lucide-react";
import Link from "next/link";

interface SafeToSpendHeroProps {
  result: SafeToSpendResult;
}

const confidenceColors = {
  high: "text-emerald-400",
  medium: "text-amber-400",
  low: "text-red-400",
};

export function SafeToSpendHero({ result }: SafeToSpendHeroProps) {
  const isLow = result.safeToSpendCents === 0;

  return (
    <Card className="relative overflow-hidden border-emerald-500/20 bg-gradient-to-br from-zinc-900 via-zinc-900 to-emerald-950/30">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-zinc-400">
              Safe to spend until payday
            </p>
            <p
              className={cn(
                "mt-1 text-5xl font-bold tracking-tight",
                isLow ? "text-red-400" : "text-emerald-400"
              )}
            >
              {formatCents(result.safeToSpendCents)}
            </p>
            <p className="mt-2 text-sm text-zinc-400">
              {result.daysUntilPayday} days until payday
            </p>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-zinc-800/80 px-3 py-1">
            <Shield className={cn("h-3.5 w-3.5", confidenceColors[result.confidence])} />
            <span className={cn("text-xs font-medium capitalize", confidenceColors[result.confidence])}>
              {result.confidence}
            </span>
          </div>
        </div>

        <p className="mt-4 text-sm text-zinc-300">
          Rent, insurance, subscriptions, and your credit-card balance are covered.
        </p>

        {result.confidenceReason && (
          <p className="mt-2 text-xs text-zinc-500">{result.confidenceReason}</p>
        )}

        <Link
          href="/home/explain"
          className="mt-4 inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300"
        >
          <Info className="h-3.5 w-3.5" />
          How was this calculated?
        </Link>
      </CardContent>
    </Card>
  );
}
