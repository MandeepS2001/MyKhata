/** Map Supabase Auth errors (and thrown fetch failures) to a readable string. */
export function getAuthErrorMessage(error: unknown): string {
  if (!error) return "Something went wrong. Please try again.";

  if (typeof error === "string" && error.trim()) return error;

  if (error instanceof TypeError && /fetch|network/i.test(error.message)) {
    return "Could not reach the server. Check your connection and try again.";
  }

  if (error instanceof Error && error.message.trim() && error.message !== "{}") {
    return friendlyAuthMessage(error.message, codeOf(error));
  }

  if (typeof error === "object" && error !== null) {
    const record = error as Record<string, unknown>;
    const message =
      (typeof record.message === "string" && record.message) ||
      (typeof record.error_description === "string" && record.error_description) ||
      (typeof record.msg === "string" && record.msg) ||
      "";
    const code = typeof record.code === "string" ? record.code : undefined;

    if (message.trim() && message !== "{}") {
      return friendlyAuthMessage(message, code);
    }

    if (code) return friendlyAuthMessage(code, code);
  }

  return "Something went wrong. Please try again.";
}

function codeOf(error: Error): string | undefined {
  const code = (error as Error & { code?: unknown }).code;
  return typeof code === "string" ? code : undefined;
}

function friendlyAuthMessage(message: string, code?: string): string {
  const key = (code ?? message).toLowerCase();

  if (key.includes("user_already_registered") || key.includes("already registered")) {
    return "An account with this email already exists. Try signing in.";
  }
  if (key.includes("invalid_credentials") || key.includes("invalid login")) {
    return "Incorrect email or password.";
  }
  if (key.includes("email_not_confirmed")) {
    return "Confirm your email before signing in. Check your inbox for the link.";
  }
  if (key.includes("weak_password") || key.includes("password")) {
    if (/weak|least|characters|pwned|strength/i.test(message)) {
      return message.endsWith(".") ? message : `${message}.`;
    }
  }
  if (key.includes("over_email_send_rate_limit") || key.includes("rate limit")) {
    return "Too many attempts. Wait a minute and try again.";
  }
  if (key.includes("signup_disabled")) {
    return "New signups are temporarily disabled.";
  }
  if (
    key.includes("database_error") ||
    /database error saving new user/i.test(message)
  ) {
    return "Account setup failed on the server. The database schema may not be fully applied.";
  }
  if (/failed to fetch|networkerror|load failed/i.test(message)) {
    return "Could not reach the server. Check your connection and try again.";
  }

  return message;
}
