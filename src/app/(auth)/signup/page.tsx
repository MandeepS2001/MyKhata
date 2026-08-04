import { SignupForm } from "@/components/auth/signup-form";

export default function SignupPage() {
  return (
    <div className="app-atmosphere flex min-h-screen items-center justify-center px-4">
      <div className="mk-rise w-full max-w-md">
        <div className="mb-8 text-center">
          <p className="font-display text-4xl font-semibold tracking-tight text-[#ffb84d]">
            MyKhata
          </p>
          <p className="mt-2 text-sm text-[#9a9186]">
            Create an account. Then get honest about the money.
          </p>
        </div>
        <SignupForm />
      </div>
    </div>
  );
}
