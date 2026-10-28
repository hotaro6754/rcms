/**
 * Reading FormData the same way in every server action.
 *
 * Checkboxes are posted as a hidden "" followed by "true" when ticked (components/admin/kit
 * Checkbox), so an unticked box still arrives and reads false.
 */

export const str = (fd: FormData, name: string) => {
  const v = fd.get(name);
  return typeof v === "string" ? v : "";
};

export const opt = (fd: FormData, name: string) => {
  const v = str(fd, name).trim();
  return v === "" ? null : v;
};

export const bool = (fd: FormData, name: string) => fd.getAll(name).includes("true");

export const int = (fd: FormData, name: string) => {
  const v = str(fd, name).trim();
  if (v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
};

export function json<T = unknown>(fd: FormData, name: string): T | null {
  const v = str(fd, name);
  if (!v) return null;
  try {
    return JSON.parse(v) as T;
  } catch {
    return null;
  }
}

/** All string fields of a form, for passing to a zod schema. */
export function fields(fd: FormData, names: string[], booleans: string[] = []) {
  const out: Record<string, unknown> = {};
  for (const n of names) out[n] = str(fd, n);
  for (const b of booleans) out[b] = bool(fd, b);
  return out;
}
