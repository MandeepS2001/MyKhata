import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { syncBasiqAfterConsent } from "@/actions/basiq";
import Link from "next/link";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function isRealJobId(value: string | undefined): value is string {
  if (!value) return false;
  const v = value.trim().toLowerCase();
  return v.length > 0 && v !== "null" && v !== "undefined";
}

function collectJobIds(
  params: Record<string, string | string[] | undefined>
): string[] {
  const ids = new Set<string>();
  const single = first(params.jobId);
  if (isRealJobId(single)) ids.add(single.trim());

  const multi = first(params.jobIds);
  if (isRealJobId(multi)) {
    for (const part of multi.split(",")) {
      if (isRealJobId(part)) ids.add(part.trim());
    }
  }
  return [...ids];
}

export default async function BanksCallbackPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const jobIds = collectJobIds(params);

  let result: Awaited<ReturnType<typeof syncBasiqAfterConsent>>;
  try {
    result = await syncBasiqAfterConsent(jobIds);
  } catch (e) {
    result = {
      error: e instanceof Error ? e.message : "Could not finish bank sync.",
    };
  }

  const ok = Boolean(result && "success" in result && result.success);
  const error = result && "error" in result ? result.error : null;
  const message =
    ok && result && "message" in result
      ? result.message
      : error ||
        (jobIds.length === 0
          ? "Basiq returned without a job id. If you closed consent early, try Connect again. Otherwise tap Sync on Bank connections."
          : "Could not finish bank sync.");

  return (
    <AppShell>
      <div className="mx-auto max-w-md space-y-5">
        <h1 className="text-2xl font-bold">
          {ok ? "Bank connected" : "Connection incomplete"}
        </h1>
        <Card className={ok ? "border-emerald-500/20" : "border-amber-500/30"}>
          <CardContent className="space-y-4 p-5">
            <p className="text-sm text-zinc-300">{message}</p>
            {ok && result && "importedRows" in result && (
              <p className="text-xs text-zinc-500">
                {result.accountCount} accounts · {result.importedRows} new
                transactions
              </p>
            )}
            <div className="flex flex-col gap-2">
              <Button asChild className="w-full">
                <Link href="/home">Go to home</Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link href="/banks">Bank connections</Link>
              </Button>
              {!ok && (
                <Button asChild variant="secondary" className="w-full">
                  <Link href="/banks">Try again</Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
