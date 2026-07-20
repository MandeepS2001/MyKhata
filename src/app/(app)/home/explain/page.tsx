import { AppShell } from "@/components/layout/app-shell";
import { getDashboardData } from "@/lib/data/dashboard";
import { Card, CardContent } from "@/components/ui/card";
import { formatCents } from "@/lib/currency";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function ExplainPage() {
  const data = await getDashboardData();
  if (!data) redirect("/login");

  const { safeToSpend } = data;

  return (
    <AppShell>
      <div className="space-y-5">
        <Link href="/home" className="text-sm text-emerald-400 hover:text-emerald-300">
          ← Back
        </Link>
        <h1 className="text-2xl font-bold">How was this calculated?</h1>
        <p className="text-sm text-zinc-400">
          Safe to spend is not simply your bank balance minus bills.
        </p>

        <Card>
          <CardContent className="space-y-3 p-5">
            {safeToSpend.breakdown.map((line) => (
              <div key={line.label} className="flex justify-between text-sm">
                <span className="text-zinc-400">{line.label}</span>
                <span
                  className={
                    line.type === "positive"
                      ? "text-emerald-400"
                      : line.type === "negative"
                        ? "text-red-400"
                        : "text-zinc-500"
                  }
                >
                  {formatCents(line.amountCents, { showSign: line.amountCents < 0 })}
                </span>
              </div>
            ))}
            <div className="border-t border-zinc-800 pt-3 flex justify-between font-semibold">
              <span>Safe to spend</span>
              <span className="text-emerald-400">
                {formatCents(safeToSpend.safeToSpendCents)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <h2 className="text-sm font-semibold text-zinc-300">Assumptions</h2>
            <ul className="mt-2 space-y-1">
              {safeToSpend.assumptions.map((a) => (
                <li key={a} className="text-xs text-zinc-500">• {a}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
