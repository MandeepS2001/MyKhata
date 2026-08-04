import { formatCents } from "@/lib/currency";
import type { SafeToSpendResult } from "@/domain/models";
import { cn } from "@/lib/utils";
import { Info, Check, AlertTriangle, Lock } from "lucide-react";
import Link from "next/link";

interface SafeToSpendHeroProps {
  result: SafeToSpendResult;
  totalCashCents?: number;
}

const BREATHING: Record<
  SafeToSpendResult["breathingRoom"],
  { label: string; className: string }
> = {
  comfortable: { label: "Feeling good", className: "bg-[#7dcea0]/15 text-[#7dcea0]" },
  stable: { label: "Steady", className: "bg-[#8ecae6]/15 text-[#8ecae6]" },
  tight: { label: "A bit tight", className: "bg-[#ffb84d]/15 text-[#ffb84d]" },
  critical: { label: "Needs attention", className: "bg-[#f0a59a]/20 text-[#f0a59a]" },
};

function negativeReason(result: SafeToSpendResult): string | null {
  const negatives = result.breakdown.filter(
    (line) => line.type === "negative" && line.amountCents < 0
  );
  if (negatives.length === 0) return null;
  const top = [...negatives]
    .sort((a, b) => a.amountCents - b.amountCents)
    .slice(0, 2)
    .map((line) => line.label.toLowerCase());
  if (top.length === 1) return top[0]!;
  return `${top[0]} and ${top[1]}`;
}

export function SafeToSpendHero({
  result,
  totalCashCents,
}: SafeToSpendHeroProps) {
  const isConstrained = result.safeToSpendCents <= 0;
  const why = negativeReason(result);
  const breathing = BREATHING[result.breathingRoom];

  const statusCopy = isConstrained
    ? why
      ? `Nothing free yet — ${why} is eating the cushion.`
      : "Nothing free yet. Add income or trim what’s reserved."
    : "This is what’s genuinely free after bills, essentials, and your buffer.";

  return (
    <section
      className={cn(
        "mk-rise relative overflow-hidden rounded-[2rem] p-6",
        isConstrained
          ? "bg-gradient-to-br from-[#2a221c] to-[#241a18]"
          : "bg-gradient-to-br from-[#2a241c] via-[#221e18] to-[#1f2a22]"
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-6 top-4 h-28 w-28 rounded-full bg-[#ffb84d]/15 blur-2xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-8 left-8 h-24 w-24 rounded-full bg-[#7dcea0]/12 blur-2xl"
      />

      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[#9a9186]">Safe to spend</p>
          <p
            className={cn(
              "font-display mt-1 text-5xl font-semibold tracking-tight",
              isConstrained ? "text-[#f0a59a]" : "text-[#ffb84d]"
            )}
          >
            {formatCents(result.safeToSpendCents)}
          </p>
          <p className="mt-2 text-sm text-[#cfc6ba]">
            {result.daysUntilPayday} day
            {result.daysUntilPayday === 1 ? "" : "s"} until payday
            {typeof totalCashCents === "number" && (
              <span className="text-[#9a9186]">
                {" "}
                · {formatCents(totalCashCents)} cash
              </span>
            )}
          </p>
        </div>
        <span
          className={cn(
            "rounded-full px-3 py-1 text-xs font-bold",
            breathing.className
          )}
        >
          {breathing.label}
        </span>
      </div>

      <div className="relative mt-5 flex flex-wrap gap-2">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
            result.billsCovered
              ? "bg-[#7dcea0]/15 text-[#7dcea0]"
              : "bg-[#f0a59a]/15 text-[#f0a59a]"
          )}
        >
          {result.billsCovered ? (
            <Check className="h-3.5 w-3.5" />
          ) : (
            <AlertTriangle className="h-3.5 w-3.5" />
          )}
          {result.billsCovered ? "Bills covered" : "Bills at risk"}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#8ecae6]/15 px-3 py-1 text-xs font-semibold text-[#8ecae6]">
          <Lock className="h-3.5 w-3.5" />
          Savings protected
        </span>
      </div>

      <p className="relative mt-4 text-sm leading-relaxed text-[#d9d0c4]">
        {statusCopy}
      </p>

      <Link
        href="/home/explain"
        className="relative mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-[#ffb84d] hover:text-[#ffc56a]"
      >
        <Info className="h-3.5 w-3.5" />
        How was this calculated?
      </Link>
    </section>
  );
}
