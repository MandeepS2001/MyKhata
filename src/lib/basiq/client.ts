import { dollarsToCents } from "@/lib/currency";

const BASIQ_API_URL =
  process.env.BASIQ_API_URL?.replace(/\/$/, "") ?? "https://au-api.basiq.io";
const BASIQ_VERSION = process.env.BASIQ_API_VERSION ?? "3.0";

type TokenScope = "SERVER_ACCESS" | "CLIENT_ACCESS";

let serverToken: { value: string; expiresAt: number } | null = null;

function requireApiKey(): string {
  const key = process.env.BASIQ_API_KEY;
  if (!key) {
    throw new Error(
      "BASIQ_API_KEY is not set. Add it to .env.local from the Basiq dashboard."
    );
  }
  return key;
}

export function isBasiqConfigured(): boolean {
  return Boolean(process.env.BASIQ_API_KEY);
}

async function requestToken(
  scope: TokenScope,
  userId?: string
): Promise<{ access_token: string; expires_in: number }> {
  const body = new URLSearchParams({ scope });
  if (scope === "CLIENT_ACCESS") {
    if (!userId) throw new Error("CLIENT_ACCESS requires a Basiq userId");
    body.set("userId", userId);
  }

  const res = await fetch(`${BASIQ_API_URL}/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${requireApiKey()}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "basiq-version": BASIQ_VERSION,
    },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Basiq token error (${res.status}): ${text}`);
  }

  return res.json() as Promise<{ access_token: string; expires_in: number }>;
}

export async function getServerAccessToken(): Promise<string> {
  const now = Date.now();
  if (serverToken && serverToken.expiresAt > now + 60_000) {
    return serverToken.value;
  }

  const data = await requestToken("SERVER_ACCESS");
  serverToken = {
    value: data.access_token,
    expiresAt: now + (data.expires_in ?? 3600) * 1000,
  };
  return serverToken.value;
}

export async function getClientAccessToken(basiqUserId: string): Promise<string> {
  const data = await requestToken("CLIENT_ACCESS", basiqUserId);
  return data.access_token;
}

export async function basiqFetch<T>(
  path: string,
  init?: RequestInit & { token?: string }
): Promise<T> {
  const token = init?.token ?? (await getServerAccessToken());
  const { token: _t, ...rest } = init ?? {};
  void _t;

  const res = await fetch(`${BASIQ_API_URL}${path}`, {
    ...rest,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      "basiq-version": BASIQ_VERSION,
      ...(rest.body ? { "Content-Type": "application/json" } : {}),
      ...rest.headers,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Basiq API ${path} failed (${res.status}): ${text}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export interface BasiqUser {
  id: string;
  email?: string;
  mobile?: string;
}

export interface BasiqAccount {
  id: string;
  name: string;
  accountNo?: string;
  currency?: string;
  balance?: string | null;
  availableFunds?: string | null;
  connection?: string;
  institution?: string;
  class?: { type?: string; product?: string };
  status?: string;
}

export interface BasiqTransaction {
  id: string;
  account: string;
  description: string;
  amount: string;
  direction: "debit" | "credit";
  status?: string;
  postDate?: string;
  transactionDate?: string;
  balance?: string | null;
  class?: string;
  connection?: string;
  institution?: string;
}

export interface BasiqJobStep {
  title: string;
  status: string;
  result?: unknown;
}

export interface BasiqJob {
  id: string;
  steps: BasiqJobStep[];
  links?: { source?: string };
}

export async function createBasiqUser(input: {
  email: string;
  firstName?: string;
}): Promise<BasiqUser> {
  return basiqFetch<BasiqUser>("/users", {
    method: "POST",
    body: JSON.stringify({
      email: input.email,
      firstName: input.firstName,
    }),
  });
}

export async function listBasiqAccounts(basiqUserId: string): Promise<BasiqAccount[]> {
  const data = await basiqFetch<{ data?: BasiqAccount[] }>(
    `/users/${basiqUserId}/accounts`
  );
  return data.data ?? [];
}

export async function listBasiqTransactions(
  basiqUserId: string,
  options?: { accountId?: string; from?: string; to?: string; limit?: number }
): Promise<BasiqTransaction[]> {
  const filters: string[] = [];
  if (options?.accountId) {
    filters.push(`account.id.eq('${options.accountId}')`);
  }
  if (options?.from) {
    filters.push(`transaction.postDate.gt('${options.from}')`);
  }
  if (options?.to) {
    filters.push(`transaction.postDate.lt('${options.to}')`);
  }

  const params = new URLSearchParams();
  if (filters.length) params.set("filter", filters.join(","));
  params.set("limit", String(options?.limit ?? 500));

  const data = await basiqFetch<{ data?: BasiqTransaction[] }>(
    `/users/${basiqUserId}/transactions?${params.toString()}`
  );
  return data.data ?? [];
}

export async function getBasiqJob(jobId: string): Promise<BasiqJob> {
  return basiqFetch<BasiqJob>(`/jobs/${jobId}`);
}

export async function waitForBasiqJob(
  jobId: string,
  opts?: { timeoutMs?: number; intervalMs?: number }
): Promise<BasiqJob> {
  const timeoutMs = opts?.timeoutMs ?? 90_000;
  const intervalMs = opts?.intervalMs ?? 2500;
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    const job = await getBasiqJob(jobId);
    const statuses = job.steps.map((s) => s.status);
    if (statuses.every((s) => s === "success")) return job;
    if (statuses.some((s) => s === "failed")) {
      throw new Error(`Basiq job ${jobId} failed`);
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }

  throw new Error(`Basiq job ${jobId} timed out`);
}

export function consentUrl(clientToken: string, action = "connect"): string {
  const url = new URL("https://consent.basiq.io/home");
  url.searchParams.set("token", clientToken);
  url.searchParams.set("action", action);
  return url.toString();
}

export function parseMoneyToCents(value: string | null | undefined): number {
  if (!value || !String(value).trim()) return 0;
  return dollarsToCents(value);
}
