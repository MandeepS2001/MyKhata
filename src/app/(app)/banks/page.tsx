import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { startBasiqConnect, syncBasiqNow, getBasiqStatus } from "@/actions/basiq";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function BanksPage({
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
  const flashError = Array.isArray(params.error) ? params.error[0] : params.error;
  const flashSynced = Array.isArray(params.synced) ? params.synced[0] : params.synced;

  const status = await getBasiqStatus();

  return (
    <AppShell>
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold">Connect bank</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Open Banking via Basiq — read-only. MyKhata never stores your bank password.
          </p>
        </div>

        {flashError && (
          <Card className="border-amber-500/30">
            <CardContent className="p-4 text-sm text-amber-300">{flashError}</CardContent>
          </Card>
        )}
        {flashSynced && (
          <Card className="border-emerald-500/20">
            <CardContent className="p-4 text-sm text-emerald-300">{flashSynced}</CardContent>
          </Card>
        )}

        {!status.configured ? (
          <Card className="border-amber-500/30">
            <CardContent className="space-y-3 p-5 text-sm text-zinc-300">
              <p className="font-medium text-amber-400">Basiq is not configured yet</p>
              <ol className="list-decimal space-y-1 pl-5 text-zinc-400">
                <li>
                  Create an app + API key at{" "}
                  <a
                    className="text-emerald-400"
                    href="https://dashboard.basiq.io"
                    target="_blank"
                    rel="noreferrer"
                  >
                    dashboard.basiq.io
                  </a>
                </li>
                <li>
                  Set redirect URL to{" "}
                  <code className="text-zinc-200">http://localhost:3000/banks/callback</code>
                </li>
                <li>
                  Add <code className="text-zinc-200">BASIQ_API_KEY=...</code> to{" "}
                  <code className="text-zinc-200">.env.local</code> and restart{" "}
                  <code className="text-zinc-200">npm run dev</code>
                </li>
              </ol>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-emerald-500/20">
            <CardHeader>
              <CardTitle className="text-base">Open Banking</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-zinc-400">
                {status.connected
                  ? "Bank linked. Sync anytime to pull the latest transactions."
                  : "Connect your Australian bank through Basiq’s secure consent flow."}
              </p>
              <form action={startBasiqConnect}>
                <Button type="submit" className="w-full">
                  {status.connected ? "Connect another bank" : "Connect with Basiq"}
                </Button>
              </form>
              {status.basiqUserId && (
                <form action={syncBasiqNow}>
                  <Button type="submit" variant="outline" className="w-full">
                    Sync accounts & transactions
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        )}

        {(status.connections ?? []).length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-medium text-zinc-300">Connections</h2>
            {status.connections.map((c) => {
              const meta = (c.metadata ?? {}) as Record<string, unknown>;
              return (
                <Card key={c.id}>
                  <CardContent className="p-4 text-sm">
                    <p className="font-medium text-zinc-100">
                      {(meta.institutionLabel as string) || "Bank connection"}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500 capitalize">
                      {c.status}
                      {c.last_synced_at
                        ? ` · Last synced ${new Date(c.last_synced_at).toLocaleString("en-AU")}`
                        : ""}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <p className="text-center text-sm text-zinc-500">
          Prefer CSV?{" "}
          <Link href="/import" className="text-emerald-400">
            Import a statement
          </Link>
        </p>
      </div>
    </AppShell>
  );
}
