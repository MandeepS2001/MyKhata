import { AppShell } from "@/components/layout/app-shell";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { TransactionCategoryButtons } from "@/components/transactions/category-buttons";
import { redirect } from "next/navigation";

export default async function ReviewTransactionsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: uncertain } = await supabase
    .from("transactions")
    .select("*")
    .eq("user_id", user.id)
    .lt("confidence_score", 0.6)
    .order("transaction_date", { ascending: false })
    .limit(20);

  return (
    <AppShell>
      <div className="space-y-5">
        <h1 className="text-2xl font-bold">Needs your help</h1>

        {(uncertain ?? []).length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-sm text-zinc-400">
              Everything is accounted for. Suspiciously responsible.
            </CardContent>
          </Card>
        ) : (
          (uncertain ?? []).map((txn) => (
            <Card key={txn.id}>
              <CardContent className="p-4">
                <p className="font-medium">{txn.description}</p>
                <p className="text-xs text-zinc-500 mt-1">
                  ${(txn.amount_cents / 100).toFixed(2)} · {txn.transaction_date}
                </p>
                <TransactionCategoryButtons
                  transactionId={txn.id}
                  merchantPattern={txn.normalised_merchant ?? txn.description}
                />
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </AppShell>
  );
}
