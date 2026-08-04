import { AppShell } from "@/components/layout/app-shell";
import { CsvImportForm } from "@/components/import/csv-import-form";
import { CreateAccountForm } from "@/components/accounts/create-account-form";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function ImportPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: accounts } = await supabase
    .from("accounts")
    .select("id, name")
    .eq("user_id", user.id)
    .eq("is_archived", false);

  const hasAccounts = (accounts ?? []).length > 0;

  return (
    <AppShell>
      <div className="space-y-5">
        <Link href="/home" className="text-sm text-emerald-400">← Back</Link>
        <div>
          <h1 className="text-2xl font-bold">Import statement</h1>
          {!hasAccounts && (
            <p className="mt-1 text-sm text-zinc-400">
              Add the account first, then upload a CommBank or Westpac CSV.
            </p>
          )}
        </div>
        {hasAccounts ? (
          <CsvImportForm accounts={accounts ?? []} />
        ) : (
          <CreateAccountForm />
        )}
      </div>
    </AppShell>
  );
}
