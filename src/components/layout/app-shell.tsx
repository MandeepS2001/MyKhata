import { BottomNav } from "./bottom-nav";
import { FloatingActionButton } from "./fab";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-950 pb-24">
      <main className="mx-auto max-w-lg px-4 pt-6">{children}</main>
      <FloatingActionButton />
      <BottomNav />
    </div>
  );
}
