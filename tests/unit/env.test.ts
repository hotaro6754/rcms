import { describe, expect, it } from "vitest";
import { checkEnv } from "@/lib/env";

const PROD = {
  NODE_ENV: "production",
  DATABASE_URL: "mysql://u:p@db.example:3306/app",
  BETTER_AUTH_SECRET: "x".repeat(44),
  BETTER_AUTH_URL: "https://www.example.com",
  NEXT_PUBLIC_APP_URL: "https://www.example.com",
  CRON_SECRET: "c".repeat(32),
  RESEND_API_KEY: "re_test",
  EMAIL_FROM: "Example <no-reply@example.com>",
  SITE_INDEXING: "on",
};

describe("environment checks", () => {
  it("accept a complete production configuration", () => {
    expect(checkEnv(PROD)).toEqual({ errors: [], warnings: [] });
  });

  it("refuse production without the required secrets, or with short ones", () => {
    const { errors } = checkEnv({ ...PROD, CRON_SECRET: "", BETTER_AUTH_SECRET: "short" });
    expect(errors.join(" ")).toMatch(/CRON_SECRET is not set/);
    expect(errors.join(" ")).toMatch(/BETTER_AUTH_SECRET is shorter/);
  });

  it("refuse plain http origins and test-only switches in production", () => {
    const { errors } = checkEnv({ ...PROD, NEXT_PUBLIC_APP_URL: "http://www.example.com", AUTH_RATE_LIMIT: "off" });
    expect(errors.join(" ")).toMatch(/NEXT_PUBLIC_APP_URL must be an https address/);
    expect(errors.join(" ")).toMatch(/AUTH_RATE_LIMIT=off/);
  });

  it("warn, without refusing, about missing email, partial Razorpay and indexing off", () => {
    const { errors, warnings } = checkEnv({ ...PROD, RESEND_API_KEY: "", RAZORPAY_KEY_ID: "rzp_test", SITE_INDEXING: "" });
    expect(errors).toEqual([]);
    expect(warnings.join(" ")).toMatch(/Neither SMTP_HOST nor RESEND_API_KEY/);
    expect(warnings.join(" ")).toMatch(/Razorpay is partly configured/);
    expect(warnings.join(" ")).toMatch(/SITE_INDEXING/);
  });

  it("only require the database and auth secret in development", () => {
    expect(checkEnv({ NODE_ENV: "development", DATABASE_URL: "mysql://root@localhost:3306/dev", BETTER_AUTH_SECRET: "x".repeat(32) }).errors).toEqual([]);
  });

  it("accept an SMTP mailbox instead of Resend, but refuse one without credentials", () => {
    const smtp = { ...PROD, RESEND_API_KEY: "", SMTP_HOST: "smtp.hostinger.com", SMTP_USER: "no-reply@example.com", SMTP_PASSWORD: "x", EMAIL_FROM: "Example <no-reply@example.com>" };
    expect(checkEnv(smtp)).toEqual({ errors: [], warnings: [] });
    expect(checkEnv({ ...smtp, SMTP_PASSWORD: "" }).errors.join(" ")).toMatch(/SMTP_USER or SMTP_PASSWORD/);
    expect(checkEnv({ ...smtp, EMAIL_FROM: "Example <hello@example.com>" }).warnings.join(" ")).toMatch(/EMAIL_FROM is not the SMTP_USER/);
  });

  it("refuse a PostgreSQL address: the app runs on MySQL or MariaDB", () => {
    expect(checkEnv({ ...PROD, DATABASE_URL: "postgresql://u:p@db.example:5432/app" }).errors.join(" ")).toMatch(/mysql:\/\//);
  });

  it("never include values in the messages", () => {
    const secret = "s3cr3t-".repeat(3);
    const { errors, warnings } = checkEnv({ ...PROD, CRON_SECRET: secret.slice(0, 10), BETTER_AUTH_SECRET: secret });
    expect([...errors, ...warnings].join(" ")).not.toContain("s3cr3t");
  });
});
