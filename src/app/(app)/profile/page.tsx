import { AppShell } from "@/components/layout/app-shell";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { signOut, reopenOnboarding } from "@/actions/profile";
import { seedDemoData } from "@/actions/demo";
import { refreshInsights } from "@/actions/insights";
import { redirect } from "next/navigation";
import Link from "next/link";
import { formatCents } from "@/lib/currency";

function housingLabel(status: string | null | undefined): string {
  switch (status) {
    case "rent":
      return "Renting";
    case "mortgage":
      return "Mortgage";
    case "own_outright":
      return "Own outright";
    case "live_with_family":
      return "Live with family / no rent";
    case "other":
      return "Other";
    default:
      return "Not set";
  }
}

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return (
    <AppShell>
      <div className="space-y-5">
        <h1 className="text-2xl font-bold">Profile</h1>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {profile?.display_name ?? "User"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-zinc-400">
            <p>{user.email}</p>
            <p>Currency: {profile?.currency ?? "AUD"}</p>
            <p>Tone: {profile?.financial_tone ?? "direct"}</p>
            <p>Caution: {profile?.caution_level ?? "balanced"}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Living costs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-zinc-400">
            <p>
              Car:{" "}
              {profile?.has_car
                ? profile.car_payment_cents
                  ? `${formatCents(profile.car_payment_cents)} / ${profile.car_payment_frequency ?? "month"}`
                  : "Yes (no finance payment)"
                : "No"}
            </p>
            <p>Housing: {housingLabel(profile?.housing_status as string | null)}</p>
            {profile?.housing_status === "rent" && (
              <>
                <p>
                  Total rent:{" "}
                  {profile.rent_total_cents != null
                    ? `${formatCents(profile.rent_total_cents)} / ${profile.rent_frequency ?? "period"}`
                    : "—"}
                </p>
                <p>
                  Your share:{" "}
                  {profile.rent_share_cents != null
                    ? formatCents(profile.rent_share_cents)
                    : "—"}
                  {profile.rent_is_split ? " (split)" : ""}
                </p>
              </>
            )}
            {profile?.housing_status === "mortgage" &&
              profile.mortgage_payment_cents != null && (
                <p>
                  Mortgage: {formatCents(profile.mortgage_payment_cents)} /{" "}
                  {profile.mortgage_payment_frequency ?? "month"}
                </p>
              )}
            <form
              action={async () => {
                "use server";
                await reopenOnboarding();
                redirect("/onboarding");
              }}
            >
              <Button variant="outline" size="sm" type="submit" className="mt-2">
                Update in questionnaire
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Phase 2</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            <Link href="/banks" className="text-sm text-emerald-400">
              Connect bank (Basiq)
            </Link>
            <Link href="/coach" className="text-sm text-emerald-400">
              AI Coach
            </Link>
            <Link href="/subscriptions" className="text-sm text-emerald-400">
              Subscriptions
            </Link>
            <Link href="/merchants" className="text-sm text-emerald-400">
              Merchants
            </Link>
            <Link href="/reports/weekly" className="text-sm text-emerald-400">
              Weekly report
            </Link>
            <Link href="/home/forecast" className="text-sm text-emerald-400">
              Cash flow forecast
            </Link>
            <Link href="/notifications" className="text-sm text-emerald-400">
              Notifications
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Privacy & trust</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-zinc-400">
            <p>Your bank password is never stored by MyKhata.</p>
            <p>Bank connections will be read-only.</p>
            <p>MyKhata cannot move your money.</p>
            <p className="text-amber-400">
              Live bank connections use Basiq Open Banking (read-only).
            </p>
            <Link href="/banks" className="inline-block text-sm text-emerald-400">
              Manage bank connections →
            </Link>
          </CardContent>
        </Card>

        <div className="space-y-2">
          <form
            action={async () => {
              "use server";
              await refreshInsights();
            }}
          >
            <Button variant="outline" className="w-full" type="submit">
              Refresh insights & recurring
            </Button>
          </form>
          <form
            action={async () => {
              "use server";
              await seedDemoData();
            }}
          >
            <Button variant="outline" className="w-full" type="submit">
              Reset demo data
            </Button>
          </form>
          <Link href="/import">
            <Button variant="outline" className="w-full">
              Import statement
            </Button>
          </Link>
          <form action={signOut}>
            <Button variant="destructive" className="w-full" type="submit">
              Sign out
            </Button>
          </form>
        </div>
      </div>
    </AppShell>
  );
}
