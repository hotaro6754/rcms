import { AsyncLocalStorage } from "node:async_hooks";
import { cliAccountCreationAllowed } from "@/lib/launch";

/**
 * Who may create an account while web sign-up is closed (pre-launch lockdown): a server script
 * (lib/launch.ts flag) or an administrator creating one from the admin, for that one call only.
 * The admin path is scoped with AsyncLocalStorage, so it never opens sign-up for anyone else
 * handled by the same server process.
 */
const scope = new AsyncLocalStorage<true>();

export function asAdministrator<T>(fn: () => Promise<T>): Promise<T> {
  return scope.run(true, fn);
}

export function accountCreationAllowed() {
  return cliAccountCreationAllowed() || scope.getStore() === true;
}
