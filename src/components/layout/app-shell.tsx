import { BottomNav } from "./bottom-nav";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="app-atmosphere">
        <main className="mx-auto max-w-lg px-4 pb-[calc(var(--bottom-nav-height)+env(safe-area-inset-bottom)+1.25rem)] pt-6">
          {children}
        </main>
      </div>
      <BottomNav />
    </>
  );
}
