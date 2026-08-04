import { AppShell } from "@/components/layout/app-shell";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCents } from "@/lib/currency";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function GoalsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: goals } = await supabase
    .from("goals")
    .select("*")
    .eq("user_id", user.id)
    .order("priority", { ascending: true });

  return (
    <AppShell>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Goals</h1>
          <Link href="/goals/new">
            <Button size="sm">Add goal</Button>
          </Link>
        </div>

        {(goals ?? []).length === 0 ? (
          <Card>
            <CardContent className="space-y-3 p-6 text-center">
              <p className="text-sm text-zinc-400">
                Money without a job tends to disappear. Give it somewhere to go.
              </p>
              <Link href="/goals/new">
                <Button>Create your first goal</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          (goals ?? []).map((goal) => {
            const progress =
              (goal.current_amount_cents / goal.target_amount_cents) * 100;
            const remaining = Math.max(
              0,
              goal.target_amount_cents - goal.current_amount_cents
            );
            const weekly = Math.max(1000, Math.round(remaining / 12));
            return (
              <Card key={goal.id}>
                <CardContent className="p-5">
                  <div className="flex justify-between">
                    <p className="font-medium">{goal.name}</p>
                    <p className="text-sm text-zinc-500">{Math.round(progress)}%</p>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-zinc-800">
                    <div
                      className="h-full rounded-full bg-emerald-500"
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-zinc-500">
                    {formatCents(goal.current_amount_cents)} of{" "}
                    {formatCents(goal.target_amount_cents)} · Suggested weekly{" "}
                    {formatCents(weekly)}
                  </p>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </AppShell>
  );
}
