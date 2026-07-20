import { SignupForm } from "@/components/auth/signup-form";

export default function SignupPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md">
        <p className="mb-6 text-center text-2xl font-bold text-emerald-400">MyKhata</p>
        <SignupForm />
      </div>
    </div>
  );
}
