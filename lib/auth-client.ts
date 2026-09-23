"use client";

import { createAuthClient } from "better-auth/react";

/**
 * Browser-side auth. Same origin, so no baseURL is needed in production; the env var only
 * exists so a preview deployment can point at itself.
 */
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL,
});

export const { signIn, signUp, signOut, useSession, sendVerificationEmail } = authClient;
