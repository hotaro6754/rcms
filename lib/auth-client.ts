"use client";

import { createAuthClient } from "better-auth/react";
import { twoFactorClient } from "better-auth/client/plugins";

/**
 * Browser-side auth. Same origin, so no baseURL is needed in production; the env var only
 * exists so a preview deployment can point at itself.
 *
 * When a password sign-in needs a second factor, the two-factor plugin answers with a
 * redirect instead of a session, and the learner lands on /two-factor.
 */
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL,
  plugins: [
    twoFactorClient({
      onTwoFactorRedirect() {
        window.location.href = "/two-factor";
      },
    }),
  ],
});

export const { signIn, signUp, signOut, useSession, sendVerificationEmail, twoFactor } = authClient;
