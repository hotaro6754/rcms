import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { createAuthMiddleware, getSessionFromCtx, isAPIError, APIError } from "better-auth/api";
import { twoFactor } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "./db";
import { sendMail } from "./email";
import { audit } from "./audit";
import { BRAND } from "@/lib/brand";

/**
 * Authentication for every surface: one user table, one session.
 *
 * - Email and password, verification required: a paid platform cannot have unverified
 *   accounts holding enrolments. Google self-disables when its credentials are absent.
 * - TOTP multi-factor authentication (two-factor plugin). Staff areas require it when
 *   ADMIN_MFA_REQUIRED is on, which is the default in production (lib/actor.ts).
 * - Rate limits stored in the database, so they hold across instances and restarts.
 * - Account lockout after LOCKOUT_THRESHOLD consecutive failed passwords.
 * - Suspended, deactivated and archived accounts cannot open a session.
 *
 * Authorisation is not decided here. Roles and permissions are read fresh from the database
 * on every request in lib/actor.ts; the account role is never writable from the client.
 */

const googleConfigured = !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET;

export const LOCKOUT_THRESHOLD = Number(process.env.LOCKOUT_THRESHOLD ?? 5);
export const LOCKOUT_MINUTES = Number(process.env.LOCKOUT_MINUTES ?? 15);

/** The version of the terms and privacy policy a new account accepts. */
export const TERMS_VERSION = process.env.TERMS_VERSION ?? "2026-10";

const BLOCKED = new Set(["SUSPENDED", "DEACTIVATED", "ARCHIVED"]);

function requestMeta(ctx: { headers?: Headers | null } | null | undefined) {
  const h = ctx?.headers;
  return {
    ip: h?.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h?.get("x-real-ip") ?? null,
    userAgent: h?.get("user-agent") ?? null,
  };
}

const rateLimitEnabled =
  process.env.AUTH_RATE_LIMIT === "on" ||
  (process.env.AUTH_RATE_LIMIT !== "off" && process.env.NODE_ENV === "production");

export const auth = betterAuth({
  appName: BRAND.name,
  database: prismaAdapter(prisma, { provider: "mysql" }),

  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  secret: process.env.BETTER_AUTH_SECRET,
  // Development servers run on more than one local port; production trusts only baseURL.
  trustedOrigins:
    process.env.NODE_ENV === "production"
      ? []
      : [
          "http://localhost:3000",
          "http://localhost:3100",
          "http://127.0.0.1:3000",
          "http://172.31.176.1:3000",
          "http://192.168.29.72:3000",
          "https://*.trycloudflare.com",
        ],

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 10,
    maxPasswordLength: 128,
    // A reset is often a response to a compromise: end every other session with it.
    revokeSessionsOnPasswordReset: true,
    async sendResetPassword({ user, url }) {
      await sendMail({
        to: user.email,
        subject: `Reset your ${BRAND.name} password`,
        text: [
          `Hello ${user.name || "there"},`,
          "",
          "Use this link to set a new password. It expires in one hour.",
          "",
          url,
          "",
          "If you did not ask for this, ignore it and nothing changes. If you keep receiving these,",
          "reply to this email: someone may be trying to get into your account.",
        ].join("\n"),
      });
    },
  },

  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    async sendVerificationEmail({ user, url }) {
      await sendMail({
        to: user.email,
        subject: `Verify your email — ${BRAND.name}`,
        text: [`Hello ${user.name || "there"},`, "", "Confirm this address to activate your account:", "", url, "", "The link expires in 24 hours."].join(
          "\n",
        ),
      });
    },
  },

  socialProviders: googleConfigured
    ? { google: { clientId: process.env.GOOGLE_CLIENT_ID!, clientSecret: process.env.GOOGLE_CLIENT_SECRET! } }
    : {},

  session: {
    // Learners stay signed in for a week of inactivity at most; activity refreshes it daily.
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    // Sensitive actions (enable MFA, change password) need a session younger than this.
    freshAge: 60 * 15,
  },

  rateLimit: {
    enabled: rateLimitEnabled,
    storage: "database",
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/email": { window: 60, max: 10 },
      "/sign-up/email": { window: 3600, max: 10 },
      "/request-password-reset": { window: 900, max: 5 },
      "/send-verification-email": { window: 900, max: 5 },
      "/two-factor/verify-totp": { window: 60, max: 10 },
      "/two-factor/verify-backup-code": { window: 60, max: 5 },
    },
  },

  user: {
    additionalFields: {
      // input: false means sign-up and update-user requests cannot set these.
      role: { type: "string", defaultValue: "STUDENT", input: false },
      status: { type: "string", defaultValue: "PENDING_VERIFICATION", input: false },
      currentRole: { type: "string", required: false },
      experience: { type: "number", required: false },
      phone: { type: "string", required: false },
      whatsapp: { type: "string", required: false },
      country: { type: "string", required: false },
      timezone: { type: "string", required: false },
      marketingOptIn: { type: "boolean", required: false, defaultValue: false },
    },
  },

  plugins: [
    twoFactor({
      issuer: BRAND.name,
      backupCodeOptions: { amount: 10, length: 10 },
    }),
    nextCookies(),
  ],

  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path === "/sign-up/email") {
        // Terms acceptance is required server-side, not just by a checkbox in the form.
        const body = (ctx.body ?? {}) as { acceptTerms?: unknown; country?: unknown; timezone?: unknown };
        if (body.acceptTerms !== true) {
          throw new APIError("BAD_REQUEST", { message: "Accept the terms of use and privacy policy to create an account.", code: "TERMS_REQUIRED" });
        }
        for (const k of ["country", "timezone"] as const) {
          if (body[k] !== undefined && (typeof body[k] !== "string" || (body[k] as string).length > 80)) {
            throw new APIError("BAD_REQUEST", { message: `Check the ${k} field.` });
          }
        }
        return;
      }
      if (ctx.path === "/two-factor/disable") {
        // Staff cannot switch off MFA while it is required for the admin area.
        const session = await getSessionFromCtx(ctx);
        if (session && process.env.ADMIN_MFA_REQUIRED !== "false" && (process.env.NODE_ENV === "production" || process.env.ADMIN_MFA_REQUIRED === "true")) {
          const staff = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true, _count: { select: { staffRoles: true } } } });
          if (staff && (staff._count.staffRoles > 0 || ["OWNER", "ADMIN", "TRAINER"].includes(staff.role))) {
            throw new APIError("FORBIDDEN", { message: "Administrators must keep multi-factor authentication on. Set up a new authenticator instead." });
          }
        }
        return;
      }
      if (ctx.path !== "/sign-in/email") return;
      const email = String((ctx.body as { email?: string } | undefined)?.email ?? "").trim().toLowerCase();
      if (!email) return;
      const user = await prisma.user.findUnique({ where: { email }, select: { id: true, lockedUntil: true } });
      if (user?.lockedUntil && user.lockedUntil > new Date()) {
        const meta = requestMeta(ctx);
        await audit({ actorId: user.id, action: "login_failed", entity: "Session", outcome: "denied", after: { reason: "locked" }, ...meta });
        throw new APIError("TOO_MANY_REQUESTS", {
          message: "Too many failed attempts. Wait a few minutes, or reset your password.",
          code: "ACCOUNT_LOCKED",
        });
      }
    }),

    after: createAuthMiddleware(async (ctx) => {
      const returned = ctx.context.returned;
      const failed = isAPIError(returned);
      const meta = requestMeta(ctx);

      if (ctx.path === "/sign-in/email" && failed) {
        const status = (returned as APIError).statusCode;
        // 401 is a wrong email or password. 403 (unverified) and 429 are not guesses.
        if (status !== 401) return;
        const email = String((ctx.body as { email?: string } | undefined)?.email ?? "").trim().toLowerCase();
        const user = email ? await prisma.user.findUnique({ where: { email }, select: { id: true, failedLoginCount: true } }) : null;
        if (!user) {
          await audit({ action: "login_failed", entity: "Session", outcome: "failure", after: { reason: "unknown_account" }, ...meta });
          return;
        }
        const count = user.failedLoginCount + 1;
        const lock = count >= LOCKOUT_THRESHOLD;
        await prisma.user.update({
          where: { id: user.id },
          data: lock
            ? { failedLoginCount: 0, lockedUntil: new Date(Date.now() + LOCKOUT_MINUTES * 60_000) }
            : { failedLoginCount: count },
        });
        await audit({ actorId: user.id, action: lock ? "lockout" : "login_failed", entity: "Session", outcome: "failure", after: { attempts: count }, ...meta });
        return;
      }

      if ((ctx.path === "/two-factor/verify-totp" || ctx.path === "/two-factor/verify-backup-code") && failed) {
        await audit({ action: "mfa_failed", entity: "TwoFactor", outcome: "failure", after: { path: ctx.path }, ...meta });
        return;
      }

      if (ctx.path === "/two-factor/enable" && !failed) {
        const userId = ctx.context.session?.user.id;
        if (userId) await audit({ actorId: userId, action: "mfa_enabled", entity: "TwoFactor", entityId: userId, ...meta });
        return;
      }

      if (ctx.path === "/two-factor/disable" && !failed) {
        const userId = ctx.context.session?.user.id;
        if (userId) await audit({ actorId: userId, action: "mfa_disabled", entity: "TwoFactor", entityId: userId, ...meta });
        return;
      }

      if (ctx.path === "/change-password" && !failed) {
        const userId = ctx.context.session?.user.id;
        if (userId) await audit({ actorId: userId, action: "password_change", entity: "Account", entityId: userId, ...meta });
        return;
      }

      if (ctx.path === "/reset-password" && !failed) {
        await audit({ action: "password_reset", entity: "Account", ...meta });
      }
    }),
  },

  databaseHooks: {
    user: {
      create: {
        // An OWNER_EMAILS address becomes OWNER at sign-up only while the platform has no
        // owner or Super Administrator yet (first-run bootstrap), so the owner sets their own
        // password and nobody else handles it. The account still cannot sign in until the
        // address is verified. After bootstrap, authority comes only through approved role
        // changes. Everyone else starts as STUDENT; role and status are forced here whatever
        // the request contained.
        before: async (user) => {
          const owners = (process.env.OWNER_EMAILS ?? "")
            .split(",")
            .map((e) => e.trim().toLowerCase())
            .filter(Boolean);
          const bootstrap =
            owners.includes(user.email.toLowerCase()) &&
            (await prisma.user.count({ where: { OR: [{ role: "OWNER" }, { staffRoles: { some: { role: "SUPER_ADMIN" } } }] } })) === 0;
          return {
            data: {
              ...user,
              role: bootstrap ? "OWNER" : "STUDENT",
              status: user.emailVerified ? "ACTIVE" : "PENDING_VERIFICATION",
              twoFactorEnabled: false,
            },
          };
        },
        after: async (user, ctx) => {
          const meta = requestMeta(ctx);
          // Sign-up is only reachable with acceptTerms === true (hooks.before), so acceptance
          // is recorded here with the policy version in force.
          const marketing = !!(user as { marketingOptIn?: boolean }).marketingOptIn;
          await prisma.user.update({ where: { id: user.id }, data: { termsAcceptedAt: new Date() } });
          await prisma.consentRecord.createMany({
            data: [
              { userId: user.id, kind: "terms", granted: true, version: TERMS_VERSION, ip: meta.ip ?? null },
              { userId: user.id, kind: "privacy", granted: true, version: TERMS_VERSION, ip: meta.ip ?? null },
              { userId: user.id, kind: "marketing", granted: marketing, version: TERMS_VERSION, ip: meta.ip ?? null },
            ],
          });
          await audit({
            actorId: user.id,
            action: "create",
            entity: "User",
            entityId: user.id,
            after: { email: user.email, name: user.name },
            ...meta,
          });
        },
      },
      update: {
        // Verification moves a pending account to active. Other statuses are owned by
        // subscriber administration and billing, never by the account holder.
        after: async (user) => {
          if (user.emailVerified && (user as { status?: string }).status === "PENDING_VERIFICATION") {
            await prisma.user.update({ where: { id: user.id }, data: { status: "ACTIVE" } });
            await audit({ actorId: user.id, action: "update", entity: "User", entityId: user.id, before: { status: "PENDING_VERIFICATION" }, after: { status: "ACTIVE", via: "email_verification" } });
          }
        },
      },
    },
    session: {
      create: {
        before: async (session) => {
          const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { status: true, lockedUntil: true } });
          if (!user || BLOCKED.has(user.status)) {
            await audit({ actorId: session.userId, action: "login_failed", entity: "Session", outcome: "denied", after: { reason: "account_status", status: user?.status } });
            return false;
          }
          if (user.lockedUntil && user.lockedUntil > new Date()) return false;
        },
        after: async (session) => {
          const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { lastLoginAt: true } });
          await prisma.user.update({
            where: { id: session.userId },
            data: {
              previousLoginAt: user?.lastLoginAt ?? null,
              lastLoginAt: new Date(),
              lastLoginIp: session.ipAddress ?? null,
              failedLoginCount: 0,
              lockedUntil: null,
            },
          });
          await audit({
            actorId: session.userId,
            action: "login",
            entity: "Session",
            entityId: session.id,
            ip: session.ipAddress,
            userAgent: session.userAgent,
          });
        },
      },
    },
  },

  advanced: {
    cookiePrefix: "rcms",
    useSecureCookies: process.env.NODE_ENV === "production",
    defaultCookieAttributes: { httpOnly: true, sameSite: "lax" },
  },
});

export type Session = typeof auth.$Infer.Session;
