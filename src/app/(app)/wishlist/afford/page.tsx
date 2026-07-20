import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent } from "@/components/ui/card";

export default function AffordPage() {
  return (
    <AppShell>
      <div className="space-y-5">
        <h1 className="text-2xl font-bold">Can I afford this?</h1>
        <Card>
          <CardContent className="p-6 text-center text-sm text-zinc-400">
            Affordability calculator coming in Phase 2.
            The engine is built — UI wiring is next.
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
