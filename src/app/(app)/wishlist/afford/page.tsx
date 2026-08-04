import { AppShell } from "@/components/layout/app-shell";
import { AffordabilityForm } from "@/components/affordability/affordability-form";
import Link from "next/link";

export default function AffordPage() {
  return (
    <AppShell>
      <div className="space-y-5">
        <Link href="/wishlist" className="text-sm text-emerald-400 hover:text-emerald-300">
          ← Wishlist
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Can I afford this?</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Uses your safe-to-spend, bills, and goals — not just your balance.
          </p>
        </div>
        <AffordabilityForm />
      </div>
    </AppShell>
  );
}
