/**
 * Checks the environment when the server starts, so a misconfigured production deployment
 * stops with a clear message instead of failing later on a learner's request.
 *
 * Only names are ever reported, never values.
 */

export type EnvReport = { errors: string[]; warnings: string[] };

const isHttps = (v: string | undefined) => {
  try {
    return new URL(v ?? "").protocol === "https:";
  } catch {
    return false;
  }
};

export function checkEnv(env: Record<string, string | undefined> = process.env): EnvReport {
  const errors: string[] = [];
  const warnings: string[] = [];
  const prod = env.NODE_ENV === "production";
  const missing = (k: string) => !env[k]?.trim();

  if (missing("DATABASE_URL")) errors.push("DATABASE_URL is not set.");
  if (missing("BETTER_AUTH_SECRET")) errors.push("BETTER_AUTH_SECRET is not set. Generate one with `openssl rand -base64 32`.");
  else if ((env.BETTER_AUTH_SECRET ?? "").length < 32) errors.push("BETTER_AUTH_SECRET is shorter than 32 characters.");

  if (!prod) return { errors, warnings };

  for (const k of ["BETTER_AUTH_URL", "NEXT_PUBLIC_APP_URL"]) {
    if (missing(k)) errors.push(`${k} is not set. It must be the public https origin, e.g. https://www.example.com.`);
    else if (!isHttps(env[k])) errors.push(`${k} must be an https address in production.`);
  }
  if (!missing("BETTER_AUTH_URL") && !missing("NEXT_PUBLIC_APP_URL") && env.BETTER_AUTH_URL !== env.NEXT_PUBLIC_APP_URL) {
    warnings.push("BETTER_AUTH_URL and NEXT_PUBLIC_APP_URL differ; sign-in links and page links will point at different origins.");
  }
  if (missing("CRON_SECRET")) errors.push("CRON_SECRET is not set. Scheduled releases, subscription renewals and retention purges would never run.");
  else if ((env.CRON_SECRET ?? "").length < 24) errors.push("CRON_SECRET is shorter than 24 characters.");

  if (missing("RESEND_API_KEY")) warnings.push("RESEND_API_KEY is not set: no email (verification, password reset, receipts) will be sent.");
  if (missing("EMAIL_FROM")) warnings.push("EMAIL_FROM is not set.");
  const rzp = ["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET", "RAZORPAY_WEBHOOK_SECRET"].filter((k) => !missing(k));
  if (rzp.length > 0 && rzp.length < 3) warnings.push("Razorpay is partly configured; set all three Razorpay variables or none.");
  if (env.AUTH_RATE_LIMIT === "off") errors.push("AUTH_RATE_LIMIT=off is for automated tests only.");
  if (env.ADMIN_MFA_REQUIRED === "false") warnings.push("ADMIN_MFA_REQUIRED=false: staff can open the admin area without two-step verification.");
  if (env.SITE_INDEXING !== "on") warnings.push("SITE_INDEXING is not \"on\": search engines are asked not to index the site.");
  return { errors, warnings };
}
