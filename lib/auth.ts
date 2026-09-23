import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./db";
import { sendMail } from "./email";
import { audit } from "./audit";

/**
 * Authentication for all four applications: one user table, one session, role on the user.
 *
 * Email and password to start, with verification required — a paid platform cannot have
 * unverified accounts holding enrolments. Google is wired but self-disables when its
 * credentials are absent, so a missing env var degrades to "email only" rather than crashing.
 *
 * Roles are STUDENT / TRAINER / ADMIN / OWNER. Authorisation is enforced per route in
 * lib/rbac.ts, never by hiding a link in the UI.
 *
 * Sign-up, sign-in and verification all write audit rows. Authentication events are the ones
 * you most want a trail of, and they are the easiest to forget.
 */

const googleConfigured =
  !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET;

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),

  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  secret: process.env.BETTER_AUTH_SECRET,

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 10,
    async sendResetPassword({ user, url }) {
      await sendMail({
        to: user.email,
        subject: "Reset your RCMS Operations Academy password",
        text: [
          `Hello ${user.name || "there"},`,
          "",
          "Use this link to set a new password. It expires in one hour.",
          "",
          url,
          "",
          "If you did not ask for this, ignore it and nothing changes.",
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
        subject: "Verify your email — RCMS Operations Academy",
        text: [
          `Hello ${user.name || "there"},`,
          "",
          "Confirm this address to activate your account:",
          "",
          url,
          "",
          "The link expires in 24 hours.",
        ].join("\n"),
      });
    },
  },

  socialProviders: googleConfigured
    ? {
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID!,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        },
      }
    : {},

  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24, // refresh once a day
  },

  user: {
    additionalFields: {
      role: { type: "string", defaultValue: "STUDENT", input: false },
      currentRole: { type: "string", required: false },
      experience: { type: "number", required: false },
      phone: { type: "string", required: false },
      whatsapp: { type: "string", required: false },
    },
  },

  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          await audit({
            actorId: user.id,
            action: "create",
            entity: "User",
            entityId: user.id,
            after: { email: user.email, name: user.name },
          });
        },
      },
    },
    session: {
      create: {
        after: async (session) => {
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
  },
});

export type Session = typeof auth.$Infer.Session;
