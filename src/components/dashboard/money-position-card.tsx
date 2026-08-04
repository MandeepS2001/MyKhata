import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCents } from "@/lib/currency";
import type { MoneyPosition } from "@/domain/services/money-position.service";
import { Wallet, PiggyBank, Banknote, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";

interface MoneyPositionCardProps {
  moneyPosition: MoneyPosition;
}

export function MoneyPositionCard({ moneyPosition }: MoneyPositionCardProps) {
  const savingsTotal =
    moneyPosition.savingsCents + moneyPosition.protectedSavingsCents;

  const tiles = [
    {
      label: "Everyday",
      value: moneyPosition.everydayCents,
      icon: Wallet,
      bubble: "bg-[#ffb84d]/15 text-[#ffb84d]",
    },
    {
      label: "Savings",
      value: savingsTotal,
      icon: PiggyBank,
      bubble: "bg-[#7dcea0]/15 text-[#7dcea0]",
    },
    {
      label: "Cash",
      value: moneyPosition.cashCents,
      icon: Banknote,
      bubble: "bg-[#8ecae6]/15 text-[#8ecae6]",
    },
    {
      label: "Card owed",
      value: moneyPosition.creditCardOwedCents,
      icon: CreditCard,
      bubble:
        moneyPosition.creditCardOwedCents > 0
          ? "bg-[#f0a59a]/15 text-[#f0a59a]"
          : "bg-white/5 text-[#9a9186]",
    },
  ];

  return (
    <Card className="mk-rise mk-rise-delay-1">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Your money</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          {tiles.map((tile) => (
            <div
              key={tile.label}
              className="rounded-[1.35rem] bg-black/20 p-3.5"
            >
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full",
                    tile.bubble
                  )}
                >
                  <tile.icon className="h-4 w-4" />
                </span>
                <span className="text-xs font-bold text-[#9a9186]">
                  {tile.label}
                </span>
              </div>
              <p className="font-display mt-3 text-xl font-semibold tracking-tight text-[#f7f1e8]">
                {formatCents(tile.value, { showSign: tile.value < 0 })}
              </p>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between px-1 pt-1">
          <span className="text-xs text-[#9a9186]">Net position</span>
          <span className="font-display text-sm font-semibold text-[#cfc6ba]">
            {formatCents(moneyPosition.netPositionCents, {
              showSign: moneyPosition.netPositionCents < 0,
            })}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
