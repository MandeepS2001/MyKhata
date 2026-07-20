import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6">
      <div className="max-w-md text-center">
        <p className="text-sm font-medium uppercase tracking-widest text-emerald-400">
          MyKhata
        </p>
        <h1 className="mt-4 text-4xl font-bold tracking-tight text-zinc-100">
          The truth about your money.
        </h1>
        <p className="mt-4 text-lg text-zinc-400">
          No spreadsheets. No manual expense tracking. No fake positivity.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button asChild size="lg">
            <Link href="/signup">Get started</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/login">Sign in</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
