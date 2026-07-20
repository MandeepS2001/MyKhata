import { AppShell } from "@/components/layout/app-shell";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { formatCents } from "@/lib/currency";
import { redirect } from "next/navigation";

export default async function WishlistPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: items } = await supabase
    .from("wishlist_items")
    .select("*")
    .eq("user_id", user.id)
    .order("priority", { ascending: true });

  return (
    <AppShell>
      <div className="space-y-5">
        <h1 className="text-2xl font-bold">Wishlist</h1>
        <p className="text-sm text-zinc-400">
          Add something and MyKhata will tell you whether it is a good idea.
        </p>

        {(items ?? []).length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-sm text-zinc-400">
              Nothing tempting you yet?
            </CardContent>
          </Card>
        ) : (
          (items ?? []).map((item) => (
            <Card key={item.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-xs text-zinc-500 capitalize">{item.status}</p>
                </div>
                <p className="text-lg font-semibold text-emerald-400">
                  {formatCents(item.price_cents)}
                </p>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </AppShell>
  );
}
