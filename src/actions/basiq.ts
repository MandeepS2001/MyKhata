"use server";

import { createClient } from "@/lib/supabase/server";
import {
  consentUrl,
  createBasiqUser,
  getClientAccessToken,
  isBasiqConfigured,
  waitForBasiqJob,
} from "@/lib/basiq/client";
import { syncBasiqDataForUser } from "@/lib/basiq/sync";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function ensureBasiqUserId(): Promise<
  { userId: string; basiqUserId: string } | { error: string }
> {
  if (!isBasiqConfigured()) {
    return {
      error:
        "Add BASIQ_API_KEY to .env.local (from dashboard.basiq.io), then restart the app.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { error: "Not authenticated" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("basiq_user_id, display_name")
    .eq("id", user.id)
    .single();

  if (profile?.basiq_user_id) {
    return { userId: user.id, basiqUserId: profile.basiq_user_id as string };
  }

  const basiqUser = await createBasiqUser({
    email: user.email,
    firstName: (profile?.display_name as string | null) ?? undefined,
  });

  const { error } = await supabase
    .from("profiles")
    .update({ basiq_user_id: basiqUser.id })
    .eq("id", user.id);

  if (error) return { error: error.message };

  return { userId: user.id, basiqUserId: basiqUser.id };
}

/** Start Consent UI — redirects the browser to Basiq. */
export async function startBasiqConnect() {
  const ensured = await ensureBasiqUserId();
  if ("error" in ensured) {
    redirect(`/banks?error=${encodeURIComponent(ensured.error)}`);
  }

  let url: string;
  try {
    const clientToken = await getClientAccessToken(ensured.basiqUserId);
    url = consentUrl(clientToken, "connect");
  } catch (e) {
    // redirect() throws NEXT_REDIRECT — never catch it. Only catch API failures here.
    const message =
      e instanceof Error ? e.message : "Could not start Basiq connect";
    redirect(`/banks?error=${encodeURIComponent(message)}`);
  }

  redirect(url);
}

export async function syncBasiqAfterConsent(jobIds: string[] = []) {
  const ensured = await ensureBasiqUserId();
  if ("error" in ensured) return { error: ensured.error };

  for (const jobId of jobIds) {
    if (!jobId) continue;
    try {
      await waitForBasiqJob(jobId);
    } catch {
      // Still attempt sync — data may already be available.
    }
  }

  // No revalidatePath here — this runs during /banks/callback page render.
  return syncBasiqDataForUser({
    userId: ensured.userId,
    basiqUserId: ensured.basiqUserId,
  });
}

export async function syncBasiqNow() {
  const ensured = await ensureBasiqUserId();
  if ("error" in ensured) {
    redirect(`/banks?error=${encodeURIComponent(ensured.error)}`);
  }

  const result = await syncBasiqDataForUser({
    userId: ensured.userId,
    basiqUserId: ensured.basiqUserId,
  });

  revalidatePath("/home");
  revalidatePath("/banks");
  revalidatePath("/activity");

  if ("error" in result && result.error) {
    redirect(`/banks?error=${encodeURIComponent(result.error)}`);
  }

  const msg =
    "message" in result && result.message
      ? result.message
      : "Sync complete";
  redirect(`/banks?synced=${encodeURIComponent(msg)}`);
}

export async function getBasiqStatus() {
  const configured = isBasiqConfigured();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { configured, connected: false, connections: [] };

  const { data: profile } = await supabase
    .from("profiles")
    .select("basiq_user_id")
    .eq("id", user.id)
    .single();

  const { data: connections } = await supabase
    .from("bank_connections")
    .select("id, status, last_synced_at, metadata, created_at")
    .eq("user_id", user.id)
    .eq("provider", "basiq")
    .order("created_at", { ascending: false });

  return {
    configured,
    basiqUserId: profile?.basiq_user_id ?? null,
    connected: (connections ?? []).some((c) => c.status === "connected"),
    connections: connections ?? [],
  };
}
