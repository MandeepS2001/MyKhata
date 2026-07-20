import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";

export default function OnboardingPage() {
  return (
    <div className="min-h-screen px-4 py-8">
      <div className="mx-auto max-w-md">
        <OnboardingWizard />
      </div>
    </div>
  );
}
