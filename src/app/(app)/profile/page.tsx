import { AppShell } from "@/components/layout/app-shell";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { signOut } from "@/actions/profile";
import { seedDemoData } from "@/actions/demo";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
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
            <CardTitle className="text-base">{profile?.display_name ?? "User"}</CardTitle>
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
            <CardTitle className="text-base">Privacy & trust</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-zinc-400">
            <p>Your bank password is never stored by MyKhata.</p>
            <p>Bank connections will be read-only.</p>
            <p>MyKhata cannot move your money.</p>
            <p className="text-amber-400">Live bank connections are not active yet.</p>
          </CardContent>
        </Card>

        <div className="space-y-2">
          <form action={async () => {
            "use server";
            await seedDemoData();
          }}>
            <Button variant="outline" className="w-full" type="submit">
              Reset demo data
            </Button>
          </form>
          <Link href="/import">
            <Button variant="outline" className="w-full">Import statement</Button>
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
