import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
type Status = "success" | "confirmed" | "error";

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parseStatus(value: string | undefined): Status {
  if (value === "success" || value === "confirmed") return value;
  return "error";
}

export default async function EmailVerifiedPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const status = parseStatus(first(params.status));
  const message = first(params.message);
  const next = first(params.next) || "/onboarding";

  const copy = {
    success: {
      title: "Email verified",
      description: "Your email is confirmed. You’re ready to set up MyKhata.",
    },
    confirmed: {
      title: "Email verified",
      description:
        message ||
        "Your email is confirmed. Sign in on this device to continue setup.",
    },
    error: {
      title: "Verification failed",
      description:
        message ||
        "We couldn’t verify your email. The link may be invalid or expired.",
    },
  }[status];

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md">
        <p className="mb-6 text-center text-2xl font-bold text-emerald-400">MyKhata</p>
        <Card>
          <CardHeader>
            <CardTitle>{copy.title}</CardTitle>
            <CardDescription>{copy.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {status === "success" ? (
              <Button asChild className="w-full">
                <Link href={next}>Continue</Link>
              </Button>
            ) : null}

            {status === "confirmed" ? (
              <Button asChild className="w-full">
                <Link href="/login">Sign in</Link>
              </Button>
            ) : null}

            {status === "error" ? (
              <>
                {message ? (
                  <p className="text-sm text-red-400" role="alert">
                    {message}
                  </p>
                ) : null}
                <Button asChild className="w-full">
                  <Link href="/login">Sign in</Link>
                </Button>
                <Button asChild variant="outline" className="w-full">
                  <Link href="/signup">Back to sign up</Link>
                </Button>
              </>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
