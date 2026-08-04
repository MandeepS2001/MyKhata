import { AppShell } from "@/components/layout/app-shell";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { redirect } from "next/navigation";
import { formatDistanceToNow } from "date-fns";

export default async function NotificationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: notifications } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(30);

  return (
    <AppShell>
      <div className="space-y-5">
        <h1 className="text-2xl font-bold">Notifications</h1>
        {(notifications ?? []).length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-sm text-zinc-400">
              No alerts yet. MyKhata will nudge you when something matters.
            </CardContent>
          </Card>
        ) : (
          (notifications ?? []).map((n) => (
            <Card key={n.id} className={n.is_read ? "opacity-60" : undefined}>
              <CardContent className="p-4">
                <p className="font-medium text-zinc-100">{n.title}</p>
                <p className="mt-1 text-sm text-zinc-400">{n.body}</p>
                <p className="mt-2 text-xs text-zinc-600">
                  {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                </p>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </AppShell>
  );
}
