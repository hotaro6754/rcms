import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

/** Every Better Auth endpoint: sign-up, sign-in, verify, reset, sign-out, OAuth callbacks. */
export const { GET, POST } = toNextJsHandler(auth);
