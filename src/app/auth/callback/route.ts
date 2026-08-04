import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

type VerifiedStatus = "success" | "confirmed" | "error";

function verifiedUrl(
  origin: string,
  status: VerifiedStatus,
  message?: string,
  next = "/onboarding"
) {
  const url = new URL("/auth/verified", origin);
  url.searchParams.set("status", status);
  if (message) url.searchParams.set("message", message);
  if (status === "success") url.searchParams.set("next", next);
  return url;
}

function isPkceVerifierMissing(message: string | undefined): boolean {
  return Boolean(message && /code verifier not found|code verifier/i.test(message));
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = (searchParams.get("type") as EmailOtpType | null) ?? "signup";
  const next = searchParams.get("next") ?? "/onboarding";
  const authError = searchParams.get("error");
  const errorDescription =
    searchParams.get("error_description")?.replace(/\+/g, " ") ??
    searchParams.get("error_code");

  if (authError) {
    // Supabase may still have confirmed the email before redirecting with an error.
    if (/otp_expired|access_denied/i.test(authError) || /expired/i.test(errorDescription ?? "")) {
      return NextResponse.redirect(
        verifiedUrl(
          origin,
          "error",
          errorDescription || "This verification link has expired. Sign in or request a new one."
        )
      );
    }
    return NextResponse.redirect(
      verifiedUrl(
        origin,
        "error",
        errorDescription || "Email verification failed. The link may be invalid or expired."
      )
    );
  }

  const supabase = await createClient();

  // Preferred SSR path: token_hash from a custom email template (no PKCE cookie needed).
  if (tokenHash) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      return NextResponse.redirect(verifiedUrl(origin, "success", undefined, next));
    }
    return NextResponse.redirect(
      verifiedUrl(origin, "error", error.message || "Could not verify your email.")
    );
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(verifiedUrl(origin, "success", undefined, next));
    }

    // Email is usually already confirmed by Supabase before redirect.
    // PKCE fails when the link is opened in another browser/device than signup.
    if (isPkceVerifierMissing(error.message)) {
      return NextResponse.redirect(
        verifiedUrl(
          origin,
          "confirmed",
          "Your email is verified. Sign in on this device to continue."
        )
      );
    }

    return NextResponse.redirect(
      verifiedUrl(origin, "error", error.message || "Could not verify your email.")
    );
  }

  return NextResponse.redirect(
    verifiedUrl(
      origin,
      "error",
      "Missing verification details. Request a new confirmation email and try again."
    )
  );
}
