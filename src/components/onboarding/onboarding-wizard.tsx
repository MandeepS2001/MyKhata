"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { updateProfile } from "@/actions/profile";
import { seedDemoData } from "@/actions/demo";
import { completeOnboarding } from "@/actions/profile";
import { TONE_LABELS, type FinancialTone } from "@/lib/tone";
import { dollarsToCents } from "@/lib/currency";

const STEPS = ["welcome", "profile", "priorities", "data", "insight"] as const;
const PRIORITIES = [
  "Emergency fund", "Business fund", "Travel", "Vehicle",
  "Education", "Flight school", "House deposit", "Debt repayment", "General savings",
];

export function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [paydayFrequency, setPaydayFrequency] = useState("monthly");
  const [incomeType, setIncomeType] = useState("salary");
  const [income, setIncome] = useState("");
  const [tone, setTone] = useState<FinancialTone>("direct");
  const [selectedPriorities, setSelectedPriorities] = useState<string[]>([]);

  async function handleDemo() {
    setLoading(true);
    await updateProfile({
      displayName: displayName || "Mandeep",
      currency: "AUD",
      paydayFrequency: paydayFrequency as "monthly",
      incomeType: incomeType as "salary",
      incomeCents: income ? dollarsToCents(parseFloat(income)) : undefined,
      financialTone: tone,
    });
    await seedDemoData();
    await completeOnboarding();
    router.push("/home");
  }

  async function handleSkip() {
    setLoading(true);
    await completeOnboarding();
    router.push("/home");
  }

  const currentStep = STEPS[step];

  return (
    <div className="space-y-6">
      <div className="flex gap-1">
        {STEPS.map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full ${i <= step ? "bg-emerald-500" : "bg-zinc-800"}`}
          />
        ))}
      </div>

      {currentStep === "welcome" && (
        <div className="space-y-6 py-8 text-center">
          <h1 className="text-3xl font-bold text-zinc-100">Welcome to MyKhata</h1>
          <div className="space-y-2 text-zinc-400">
            <p>No spreadsheets.</p>
            <p>No manual expense tracking.</p>
            <p>No fake positivity.</p>
            <p className="text-emerald-400 font-medium">Just the truth about your money.</p>
          </div>
          <Button onClick={() => setStep(1)} className="w-full" size="lg">
            Let&apos;s go
          </Button>
        </div>
      )}

      {currentStep === "profile" && (
        <Card>
          <CardContent className="space-y-4 p-6">
            <h2 className="text-xl font-semibold">About you</h2>
            <div className="space-y-2">
              <Label>Display name</Label>
              <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Mandeep" />
            </div>
            <div className="space-y-2">
              <Label>Payday frequency</Label>
              <select
                value={paydayFrequency}
                onChange={(e) => setPaydayFrequency(e.target.value)}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm"
              >
                <option value="weekly">Weekly</option>
                <option value="fortnightly">Fortnightly</option>
                <option value="monthly">Monthly</option>
                <option value="irregular">Irregular</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Income type</Label>
              <select
                value={incomeType}
                onChange={(e) => setIncomeType(e.target.value)}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm"
              >
                <option value="hourly">Hourly</option>
                <option value="salary">Salary</option>
                <option value="variable">Variable</option>
                <option value="mixed">Mixed</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Approximate monthly income (AUD)</Label>
              <Input type="number" value={income} onChange={(e) => setIncome(e.target.value)} placeholder="4126" />
            </div>
            <div className="space-y-2">
              <Label>Financial tone</Label>
              <div className="grid grid-cols-3 gap-2">
                {(["direct", "blunt", "roast"] as FinancialTone[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTone(t)}
                    className={`rounded-xl border px-3 py-2 text-sm capitalize ${
                      tone === t ? "border-emerald-500 bg-emerald-500/10 text-emerald-400" : "border-zinc-700 text-zinc-400"
                    }`}
                  >
                    {TONE_LABELS[t]}
                  </button>
                ))}
              </div>
            </div>
            <Button onClick={() => setStep(2)} className="w-full">Continue</Button>
          </CardContent>
        </Card>
      )}

      {currentStep === "priorities" && (
        <Card>
          <CardContent className="space-y-4 p-6">
            <h2 className="text-xl font-semibold">Financial priorities</h2>
            <p className="text-sm text-zinc-400">Select what matters to you.</p>
            <div className="flex flex-wrap gap-2">
              {PRIORITIES.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() =>
                    setSelectedPriorities((prev) =>
                      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
                    )
                  }
                  className={`rounded-full border px-4 py-2 text-sm ${
                    selectedPriorities.includes(p)
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                      : "border-zinc-700 text-zinc-400"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            <Button onClick={() => setStep(3)} className="w-full">Continue</Button>
          </CardContent>
        </Card>
      )}

      {currentStep === "data" && (
        <Card>
          <CardContent className="space-y-4 p-6">
            <h2 className="text-xl font-semibold">Set up your data</h2>
            <Button onClick={handleDemo} className="w-full" disabled={loading}>
              {loading ? "Setting up..." : "Use demo data"}
            </Button>
            <Button variant="outline" className="w-full" onClick={() => router.push("/import")}>
              Import CommBank CSV
            </Button>
            <Button variant="outline" className="w-full" onClick={() => router.push("/import")}>
              Import Westpac CSV
            </Button>
            <Button variant="ghost" className="w-full text-zinc-500" disabled>
              Connect bank — Coming soon
            </Button>
            <Button variant="ghost" className="w-full" onClick={handleSkip}>
              Skip for now
            </Button>
          </CardContent>
        </Card>
      )}

      {currentStep === "insight" && (
        <Card>
          <CardContent className="space-y-4 p-6 text-center">
            <h2 className="text-xl font-semibold text-emerald-400">You&apos;re all set</h2>
            <p className="text-sm text-zinc-400">
              Your balance looks healthy because rent has not left yet. That money is not free.
            </p>
            <Button onClick={() => router.push("/home")} className="w-full">
              Go to dashboard
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
