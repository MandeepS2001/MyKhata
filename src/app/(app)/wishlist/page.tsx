import { AppShell } from "@/components/layout/app-shell";
import { WishlistForm } from "@/components/wishlist/wishlist-form";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { formatCents } from "@/lib/currency";
import { redirect } from "next/navigation";
import Link from "next/link";

const STATUS_STYLES: Record<string, string> = {
  thinking: "bg-zinc-700/50 text-zinc-300",
  saving: "bg-sky-500/15 text-sky-400",
  affordable: "bg-emerald-500/15 text-emerald-400",
  wait: "bg-amber-500/15 text-amber-400",
  not_affordable: "bg-red-500/15 text-red-400",
  purchased: "bg-emerald-500/20 text-emerald-300",
  abandoned: "bg-zinc-800 text-zinc-500",
};

export default async function WishlistPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: items } = await supabase
    .from("wishlist_items")
    .select("*")
    .eq("user_id", user.id)
    .order("priority", { ascending: true });

  return (
    <AppShell>
      <div className="space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Wishlist</h1>
            <p className="mt-1 text-sm text-zinc-400">
              Add something and MyKhata will tell you whether it is a good idea.
            </p>
          </div>
          <Link
            href="/wishlist/afford"
            className="shrink-0 rounded-xl border border-emerald-500/30 px-3 py-2 text-xs font-medium text-emerald-400 hover:bg-emerald-500/10"
          >
            Can I afford this?
          </Link>
        </div>

        <WishlistForm />

        {(items ?? []).length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-sm text-zinc-400">
              Nothing tempting you yet?
            </CardContent>
          </Card>
        ) : (
          (items ?? []).map((item) => {
            const progress =
              item.price_cents > 0
                ? (item.saved_amount_cents / item.price_cents) * 100
                : 0;
            const status = (item.status as string) ?? "thinking";
            return (
              <Card key={item.id}>
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <span
                        className={`mt-1 inline-block rounded-md px-2 py-0.5 text-xs capitalize ${
                          STATUS_STYLES[status] ?? STATUS_STYLES.thinking
                        }`}
                      >
                        {status.replace(/_/g, " ")}
                      </span>
                    </div>
                    <p className="text-lg font-semibold text-emerald-400">
                      {formatCents(item.price_cents)}
                    </p>
                  </div>
                  <div>
                    <div className="mb-1 flex justify-between text-xs text-zinc-500">
                      <span>
                        {formatCents(item.saved_amount_cents)} saved
                      </span>
                      <span>{Math.round(progress)}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-zinc-800">
                      <div
                        className="h-full rounded-full bg-emerald-500"
                        style={{ width: `${Math.min(progress, 100)}%` }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </AppShell>
  );
}
