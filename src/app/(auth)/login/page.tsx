import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md">
        <p className="mb-6 text-center text-2xl font-bold text-emerald-400">MyKhata</p>
        <LoginForm />
      </div>
    </div>
  );
}
