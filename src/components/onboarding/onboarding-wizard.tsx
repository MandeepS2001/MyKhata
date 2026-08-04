"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { updateProfile, completeOnboarding } from "@/actions/profile";
import { seedDemoData } from "@/actions/demo";
import { TONE_LABELS, type FinancialTone } from "@/lib/tone";
import { dollarsToCents } from "@/lib/currency";
import type { HousingStatus, RecurringFrequency } from "@/domain/models";
import Link from "next/link";

const STEPS = ["welcome", "profile", "living", "priorities", "data"] as const;
const PRIORITIES = [
  "Emergency fund",
  "Business fund",
  "Travel",
  "Vehicle",
  "Education",
  "Flight school",
  "House deposit",
  "Debt repayment",
  "General savings",
];

const FREQUENCIES: { value: RecurringFrequency; label: string }[] = [
  { value: "weekly", label: "Weekly" },
  { value: "fortnightly", label: "Fortnightly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly", label: "Yearly" },
];

const HOUSING_OPTIONS: { value: HousingStatus; label: string }[] = [
  { value: "rent", label: "I rent" },
  { value: "mortgage", label: "I have a mortgage" },
  { value: "own_outright", label: "I own outright" },
  { value: "live_with_family", label: "Live with family / no rent" },
  { value: "other", label: "Other" },
];

function dollarsOrNull(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = parseFloat(trimmed);
  if (Number.isNaN(n) || n < 0) return null;
  return dollarsToCents(n);
}

export function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState("");
  const [paydayFrequency, setPaydayFrequency] = useState("monthly");
  const [incomeType, setIncomeType] = useState("salary");
  const [income, setIncome] = useState("");
  const [tone, setTone] = useState<FinancialTone>("direct");
  const [selectedPriorities, setSelectedPriorities] = useState<string[]>([]);

  const [hasCar, setHasCar] = useState(false);
  const [carPayment, setCarPayment] = useState("");
  const [carPaymentFrequency, setCarPaymentFrequency] =
    useState<RecurringFrequency>("monthly");

  const [housingStatus, setHousingStatus] = useState<HousingStatus | "">("");
  const [rentFrequency, setRentFrequency] =
    useState<RecurringFrequency>("weekly");
  const [rentTotal, setRentTotal] = useState("");
  const [rentIsSplit, setRentIsSplit] = useState(false);
  const [rentShare, setRentShare] = useState("");
  const [mortgagePayment, setMortgagePayment] = useState("");
  const [mortgageFrequency, setMortgageFrequency] =
    useState<RecurringFrequency>("monthly");

  function livingPayload() {
    const rentTotalCents = dollarsOrNull(rentTotal);
    const rentShareCents = rentIsSplit
      ? dollarsOrNull(rentShare)
      : rentTotalCents;

    return {
      hasCar,
      carPaymentCents: hasCar ? dollarsOrNull(carPayment) : null,
      carPaymentFrequency: hasCar && carPayment.trim() ? carPaymentFrequency : null,
      housingStatus: (housingStatus || null) as HousingStatus | null,
      rentFrequency: housingStatus === "rent" ? rentFrequency : null,
      rentTotalCents: housingStatus === "rent" ? rentTotalCents : null,
      rentShareCents: housingStatus === "rent" ? rentShareCents : null,
      rentIsSplit: housingStatus === "rent" ? rentIsSplit : false,
      mortgagePaymentCents:
        housingStatus === "mortgage" ? dollarsOrNull(mortgagePayment) : null,
      mortgagePaymentFrequency:
        housingStatus === "mortgage" && mortgagePayment.trim()
          ? mortgageFrequency
          : null,
    };
  }

  async function saveProfile() {
    return updateProfile({
      displayName: displayName || "User",
      currency: "AUD",
      paydayFrequency: paydayFrequency as "monthly",
      incomeType: incomeType as "salary",
      incomeCents: income ? dollarsToCents(parseFloat(income)) : undefined,
      financialTone: tone,
      ...livingPayload(),
    });
  }

  async function handleDemo() {
    setLoading(true);
    setError(null);
    const result = await saveProfile();
    if (result?.error) {
      setError(result.error);
      setLoading(false);
      return;
    }
    await seedDemoData();
    await completeOnboarding();
    router.push("/home");
  }

  async function handleSkip() {
    setLoading(true);
    setError(null);
    const result = await saveProfile();
    if (result?.error) {
      setError(result.error);
      setLoading(false);
      return;
    }
    await completeOnboarding();
    router.push("/home");
  }

  async function handleImport() {
    setLoading(true);
    setError(null);
    const result = await saveProfile();
    if (result?.error) {
      setError(result.error);
      setLoading(false);
      return;
    }
    await completeOnboarding();
    router.push("/import");
  }

  async function handleConnectBank() {
    setLoading(true);
    setError(null);
    const result = await saveProfile();
    if (result?.error) {
      setError(result.error);
      setLoading(false);
      return;
    }
    await completeOnboarding();
    router.push("/banks");
  }

  function validateLiving(): string | null {
    if (!housingStatus) return "Choose your housing situation.";
    if (housingStatus === "rent") {
      if (!rentTotal.trim()) return "Enter the total rent amount.";
      if (rentIsSplit && !rentShare.trim()) {
        return "Enter how much of the rent you pay.";
      }
      if (rentIsSplit) {
        const total = parseFloat(rentTotal);
        const share = parseFloat(rentShare);
        if (!Number.isNaN(total) && !Number.isNaN(share) && share > total) {
          return "Your share can’t be more than the total rent.";
        }
      }
    }
    if (housingStatus === "mortgage" && !mortgagePayment.trim()) {
      return "Enter your mortgage payment (or choose a different housing option).";
    }
    if (hasCar && carPayment.trim()) {
      const n = parseFloat(carPayment);
      if (Number.isNaN(n) || n < 0) return "Enter a valid car payment amount.";
    }
    return null;
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

      {error && (
        <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
          {error}
        </p>
      )}

      {currentStep === "welcome" && (
        <div className="space-y-6 py-8 text-center">
          <h1 className="text-3xl font-bold text-zinc-100">Welcome to MyKhata</h1>
          <div className="space-y-2 text-zinc-400">
            <p>No spreadsheets.</p>
            <p>No manual expense tracking.</p>
            <p>No fake positivity.</p>
            <p className="font-medium text-emerald-400">
              Just the truth about your money.
            </p>
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
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Mandeep"
              />
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
              <Input
                type="number"
                value={income}
                onChange={(e) => setIncome(e.target.value)}
                placeholder="4126"
              />
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
                      tone === t
                        ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                        : "border-zinc-700 text-zinc-400"
                    }`}
                  >
                    {TONE_LABELS[t]}
                  </button>
                ))}
              </div>
            </div>
            <Button onClick={() => setStep(2)} className="w-full">
              Continue
            </Button>
          </CardContent>
        </Card>
      )}

      {currentStep === "living" && (
        <Card>
          <CardContent className="space-y-5 p-6">
            <div>
              <h2 className="text-xl font-semibold">Living costs</h2>
              <p className="mt-1 text-sm text-zinc-400">
                So Safe-to-Spend knows what&apos;s already spoken for — including
                your share of shared rent.
              </p>
            </div>

            <div className="space-y-3">
              <Label>Do you have a car?</Label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: true, label: "Yes" },
                  { value: false, label: "No" },
                ].map((opt) => (
                  <button
                    key={String(opt.value)}
                    type="button"
                    onClick={() => setHasCar(opt.value)}
                    className={`rounded-xl border px-3 py-2.5 text-sm ${
                      hasCar === opt.value
                        ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                        : "border-zinc-700 text-zinc-400"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {hasCar && (
                <div className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
                  <div className="space-y-2">
                    <Label>Car / finance payment (your amount)</Label>
                    <Input
                      type="number"
                      inputMode="decimal"
                      value={carPayment}
                      onChange={(e) => setCarPayment(e.target.value)}
                      placeholder="0 if owned outright"
                    />
                  </div>
                  {carPayment.trim() && (
                    <div className="space-y-2">
                      <Label>Payment frequency</Label>
                      <select
                        value={carPaymentFrequency}
                        onChange={(e) =>
                          setCarPaymentFrequency(
                            e.target.value as RecurringFrequency
                          )
                        }
                        className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm"
                      >
                        {FREQUENCIES.map((f) => (
                          <option key={f.value} value={f.value}>
                            {f.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <Label>Housing</Label>
              <div className="grid gap-2">
                {HOUSING_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setHousingStatus(opt.value)}
                    className={`rounded-xl border px-3 py-2.5 text-left text-sm ${
                      housingStatus === opt.value
                        ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                        : "border-zinc-700 text-zinc-400"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {housingStatus === "rent" && (
              <div className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
                <div className="space-y-2">
                  <Label>Rent frequency</Label>
                  <select
                    value={rentFrequency}
                    onChange={(e) =>
                      setRentFrequency(e.target.value as RecurringFrequency)
                    }
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm"
                  >
                    {FREQUENCIES.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Total rent for the place (AUD)</Label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    value={rentTotal}
                    onChange={(e) => setRentTotal(e.target.value)}
                    placeholder="2200"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Is rent split with someone else?</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: true, label: "Yes, split" },
                      { value: false, label: "No, I pay all" },
                    ].map((opt) => (
                      <button
                        key={String(opt.value)}
                        type="button"
                        onClick={() => setRentIsSplit(opt.value)}
                        className={`rounded-xl border px-3 py-2.5 text-sm ${
                          rentIsSplit === opt.value
                            ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                            : "border-zinc-700 text-zinc-400"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                {rentIsSplit && (
                  <div className="space-y-2">
                    <Label>What you pay (AUD)</Label>
                    <Input
                      type="number"
                      inputMode="decimal"
                      value={rentShare}
                      onChange={(e) => setRentShare(e.target.value)}
                      placeholder="1400"
                    />
                    <p className="text-xs text-zinc-500">
                      Example: place is $2,200 total, you pay $1,400 — we only
                      count your share.
                    </p>
                  </div>
                )}
              </div>
            )}

            {housingStatus === "mortgage" && (
              <div className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
                <div className="space-y-2">
                  <Label>Mortgage repayment (AUD)</Label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    value={mortgagePayment}
                    onChange={(e) => setMortgagePayment(e.target.value)}
                    placeholder="2800"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Payment frequency</Label>
                  <select
                    value={mortgageFrequency}
                    onChange={(e) =>
                      setMortgageFrequency(e.target.value as RecurringFrequency)
                    }
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm"
                  >
                    {FREQUENCIES.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setStep(1)}
              >
                Back
              </Button>
              <Button
                className="flex-1"
                onClick={() => {
                  const msg = validateLiving();
                  if (msg) {
                    setError(msg);
                    return;
                  }
                  setError(null);
                  setStep(3);
                }}
              >
                Continue
              </Button>
            </div>
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
                      prev.includes(p)
                        ? prev.filter((x) => x !== p)
                        : [...prev, p]
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
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setStep(2)}
              >
                Back
              </Button>
              <Button onClick={() => setStep(4)} className="flex-1">
                Continue
              </Button>
            </div>
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
            <Button
              onClick={handleImport}
              variant="outline"
              className="w-full"
              disabled={loading}
            >
              Import bank CSV
            </Button>
            <Button
              onClick={handleConnectBank}
              variant="outline"
              className="w-full"
              disabled={loading}
            >
              Connect bank (Basiq)
            </Button>
            <Button
              variant="ghost"
              className="w-full"
              onClick={handleSkip}
              disabled={loading}
            >
              Skip for now
            </Button>
            <p className="text-center text-xs text-zinc-500">
              You can also open{" "}
              <Link href="/banks" className="text-emerald-400">
                Connect bank
              </Link>{" "}
              anytime after setup.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
