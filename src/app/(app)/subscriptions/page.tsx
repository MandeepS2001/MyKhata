import { AppShell } from "@/components/layout/app-shell";
import { createClient } from "@/lib/supabase/server";
import { recurringPaymentService } from "@/domain/services/recurring.service";
import { mapTransactionRow } from "@/lib/data/mappers";
import { Card, CardContent } from "@/components/ui/card";
import { formatCents } from "@/lib/currency";
import { differenceInCalendarDays, parseISO } from "date-fns";
import { redirect } from "next/navigation";

function monthlyFromAnnual(annualCents: number, frequency: string): number {
  if (frequency === "yearly") return Math.round(annualCents / 12);
  if (frequency === "monthly") return Math.round(annualCents / 12);
  return Math.round(annualCents / 12);
}

export default async function SubscriptionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: txnRows } = await supabase
    .from("transactions")
    .select("*")
    .eq("user_id", user.id)
    .order("transaction_date", { ascending: false })
    .limit(500);

  const transactions = (txnRows ?? []).map(mapTransactionRow);
  const detected = recurringPaymentService.detect(transactions);

  // Best-effort persist: insert rows that are not already stored for this merchant
  if (detected.length > 0) {
    const { data: existing } = await supabase
      .from("recurring_payments")
      .select("merchant")
      .eq("user_id", user.id);
    const known = new Set(
      (existing ?? []).map((r) => (r.merchant as string).toLowerCase())
    );
    const toInsert = detected
      .filter((item) => !known.has(item.merchant.toLowerCase()))
      .slice(0, 40)
      .map((item) => ({
        user_id: user.id,
        merchant: item.merchant,
        amount_cents_min: item.amountCentsMin,
        amount_cents_max: item.amountCentsMax,
        frequency: item.frequency,
        next_expected_date: item.nextExpectedDate,
        category: item.category,
        is_essential: item.isEssential,
        is_active: true,
        confidence: item.confidence,
      }));
    if (toInsert.length > 0) {
      await supabase.from("recurring_payments").insert(toInsert);
    }
  }

  const today = new Date();

  return (
    <AppShell>
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold">Subscriptions</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Recurring payments detected from your transactions.
          </p>
        </div>

        {detected.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-sm text-zinc-400">
              No recurring payments found yet. Import more history to improve
              detection.
            </CardContent>
          </Card>
        ) : (
          detected.map((item) => {
            const daysSince = differenceInCalendarDays(
              today,
              parseISO(item.lastPaymentDate)
            );
            const unusedLooking = daysSince > 45 && !item.isEssential;
            const monthlyCents = monthlyFromAnnual(
              item.annualCostCents,
              item.frequency
            );

            return (
              <Card key={`${item.merchant}-${item.frequency}`}>
                <CardContent className="space-y-2 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{item.merchant}</p>
                      <p className="text-xs capitalize text-zinc-500">
                        {item.frequency}
                        {item.isEssential ? " · essential" : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-emerald-400">
                        {formatCents(monthlyCents)}/mo
                      </p>
                      <p className="text-xs text-zinc-500">
                        {formatCents(item.annualCostCents)}/yr
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-zinc-500">
                    Next expected: {item.nextExpectedDate} · Last paid:{" "}
                    {item.lastPaymentDate}
                  </p>
                  {unusedLooking && (
                    <p className="text-sm text-amber-400">
                      Potential cancel — last payment was {daysSince} days ago.
                      Worth checking if you still use this.
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </AppShell>
  );
}
