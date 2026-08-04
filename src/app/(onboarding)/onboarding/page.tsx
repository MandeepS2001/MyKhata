import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { WizardInitialValues } from "@/components/onboarding/onboarding-wizard";
import type {
  CautionLevel,
  HousingStatus,
  IncomeType,
  PaydayFrequency,
  RecurringFrequency,
} from "@/domain/models";
import type { FinancialTone } from "@/lib/tone";

type SearchParams = Promise<{ edit?: string }>;

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const isEdit = params.edit === "1" || params.edit === "true";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // First-time users who somehow land here after completing stay on home
  // unless they explicitly opened edit mode from Settings.
  if (profile?.onboarding_completed && !isEdit) {
    redirect("/home");
  }

  const initial: WizardInitialValues = {
    displayName: profile?.display_name,
    paydayFrequency: profile?.payday_frequency as PaydayFrequency | null,
    incomeType: profile?.income_type as IncomeType | null,
    incomeCents: profile?.income_cents,
    financialTone: profile?.financial_tone as FinancialTone | null,
    cautionLevel: profile?.caution_level as CautionLevel | null,
    financialPriorities: Array.isArray(profile?.financial_priorities)
      ? (profile.financial_priorities as string[])
      : [],
    hasCar: profile?.has_car,
    carPaymentCents: profile?.car_payment_cents,
    carPaymentFrequency:
      profile?.car_payment_frequency as RecurringFrequency | null,
    housingStatus: profile?.housing_status as HousingStatus | null,
    rentFrequency: profile?.rent_frequency as RecurringFrequency | null,
    rentTotalCents: profile?.rent_total_cents,
    rentShareCents: profile?.rent_share_cents,
    rentIsSplit: profile?.rent_is_split,
    mortgagePaymentCents: profile?.mortgage_payment_cents,
    mortgagePaymentFrequency:
      profile?.mortgage_payment_frequency as RecurringFrequency | null,
  };

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="mx-auto max-w-md">
        <OnboardingWizard
          mode={isEdit ? "edit" : "onboarding"}
          initial={initial}
        />
      </div>
    </div>
  );
}
