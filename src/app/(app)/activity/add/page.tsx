import { AppShell } from "@/components/layout/app-shell";
import { AddTransactionForm } from "@/components/transactions/add-transaction-form";
import { createClient } from "@/lib/supabase/server";
import { mapAccountRow } from "@/lib/data/mappers";
import { Card, CardContent } from "@/components/ui/card";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function AddTransactionPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const modeParam = Array.isArray(params.mode) ? params.mode[0] : params.mode;
  const initialMode =
    modeParam === "moved" || modeParam === "received" || modeParam === "spent"
      ? modeParam
      : undefined;

  const { data: accountRows } = await supabase
    .from("accounts")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_archived", false)
    .order("name", { ascending: true });

  const accounts = (accountRows ?? []).map(mapAccountRow);

  return (
    <AppShell>
      <div className="space-y-5">
        <Link href="/activity" className="text-sm text-emerald-400 hover:text-emerald-300">
          ← Activity
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Add transaction</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Track cash, transfers, or anything that didn&apos;t come from a statement.
          </p>
        </div>

        {accounts.length === 0 ? (
          <Card>
            <CardContent className="space-y-3 p-6 text-center text-sm text-zinc-400">
              <p>Add an account first so MyKhata knows where the money is.</p>
              <Link
                href="/import"
                className="inline-block rounded-xl bg-emerald-500 px-4 py-2 text-sm font-medium text-black hover:bg-emerald-400"
              >
                Add an account
              </Link>
            </CardContent>
          </Card>
        ) : (
          <AddTransactionForm accounts={accounts} initialMode={initialMode} />
        )}
      </div>
    </AppShell>
  );
}
