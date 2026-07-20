import { AppShell } from "@/components/layout/app-shell";
import { CsvImportForm } from "@/components/import/csv-import-form";
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

  return (
    <AppShell>
      <div className="space-y-5">
        <Link href="/profile" className="text-sm text-emerald-400">← Back</Link>
        <h1 className="text-2xl font-bold">Import statement</h1>
        {(accounts ?? []).length === 0 ? (
          <p className="text-sm text-zinc-400">
            No accounts yet. Use demo mode or add an account first.
          </p>
        ) : (
          <CsvImportForm accounts={accounts ?? []} />
        )}
      </div>
    </AppShell>
  );
}
