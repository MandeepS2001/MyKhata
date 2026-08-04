import { AppShell } from "@/components/layout/app-shell";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { signOut } from "@/actions/profile";
import { seedDemoData } from "@/actions/demo";
import { refreshInsights } from "@/actions/insights";
import {
  NotificationSettingsForm,
  ProfileQuickSettings,
} from "@/components/profile/settings-forms";
import { redirect } from "next/navigation";
import Link from "next/link";
import { formatCents } from "@/lib/currency";
import type { CautionLevel, FinancialTone } from "@/domain/models";
import {
  ChevronRight,
  ClipboardList,
  Landmark,
  Upload,
  Bell,
  Shield,
  UserRound,
} from "lucide-react";

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

  const [{ data: profile }, { data: prefs }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase
      .from("user_preferences")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  const priorities = Array.isArray(profile?.financial_priorities)
    ? (profile.financial_priorities as string[])
    : [];

  return (
    <AppShell>
      <div className="space-y-5">
        <div className="mk-rise">
          <p className="text-sm font-bold text-[#ffb84d]">Settings</p>
          <h1 className="font-display mt-1 text-3xl font-semibold tracking-tight">
            Your profile
          </h1>
          <p className="mt-1 text-sm text-[#9a9186]">
            Preferences, living costs, and how MyKhata talks to you.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserRound className="h-4 w-4 text-[#ffb84d]" />
              Account
            </CardTitle>
            <CardDescription>{user.email}</CardDescription>
          </CardHeader>
          <CardContent>
            <ProfileQuickSettings
              displayName={profile?.display_name ?? ""}
              financialTone={
                (profile?.financial_tone as FinancialTone) ?? "direct"
              }
              cautionLevel={
                (profile?.caution_level as CautionLevel) ?? "balanced"
              }
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardList className="h-4 w-4 text-[#ffb84d]" />
              Money questionnaire
            </CardTitle>
            <CardDescription>
              Income, living costs, and priorities used for Safe-to-Spend.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-[#9a9186]">
            <p>
              Payday: {profile?.payday_frequency ?? "—"} · Income type:{" "}
              {profile?.income_type ?? "—"}
            </p>
            <p>
              Approx income:{" "}
              {profile?.income_cents != null
                ? `${formatCents(profile.income_cents)} / month`
                : "—"}
            </p>
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
            {priorities.length > 0 && (
              <p>Priorities: {priorities.join(", ")}</p>
            )}
            <Link href="/onboarding?edit=1" className="block pt-1">
              <Button variant="outline" className="w-full">
                Update questionnaire
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Bell className="h-4 w-4 text-[#ffb84d]" />
              Notifications
            </CardTitle>
            <CardDescription>
              Choose what MyKhata should nudge you about.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <NotificationSettingsForm
              initial={{
                notifySalary: prefs?.notify_salary ?? true,
                notifyBills: prefs?.notify_bills ?? true,
                notifySafeToSpend: prefs?.notify_safe_to_spend ?? true,
                notifyGoals: prefs?.notify_goals ?? true,
                notifyWishlist: prefs?.notify_wishlist ?? true,
                notifyWeeklySummary: prefs?.notify_weekly_summary ?? true,
                notifyUnusualTransactions:
                  prefs?.notify_unusual_transactions ?? true,
              }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Data & connections</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {[
              { href: "/banks", label: "Bank connections", icon: Landmark },
              { href: "/import", label: "Import statement", icon: Upload },
              {
                href: "/activity/review",
                label: "Review unknown transactions",
                icon: ClipboardList,
              },
              {
                href: "/notifications",
                label: "Notification centre",
                icon: Bell,
              },
            ].map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 rounded-xl px-2 py-3 text-sm text-[#f7f1e8] hover:bg-white/5"
              >
                <Icon className="h-4 w-4 text-[#ffb84d]" />
                <span className="flex-1">{label}</span>
                <ChevronRight className="h-4 w-4 text-[#6f675e]" />
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="h-4 w-4 text-[#ffb84d]" />
              Privacy & trust
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-[#9a9186]">
            <p>Your bank password is never stored by MyKhata.</p>
            <p>Bank connections are read-only via Open Banking.</p>
            <p>MyKhata cannot move your money.</p>
          </CardContent>
        </Card>

        <div className="space-y-2 pb-4">
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
            <Button variant="secondary" className="w-full" type="submit">
              Reset demo data
            </Button>
          </form>
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
