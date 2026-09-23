import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

/** $184,000 -> "$184K", $2,810,000 -> "$2.81M" */
export function money(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `$${Math.round(value / 1_000)}K`;
  return usd.format(value);
}

export function count(value: number): string {
  return new Intl.NumberFormat("en-US").format(Math.round(value));
}

export function signed(value: number, precision = 1): string {
  const fixed = value.toFixed(precision);
  return value > 0 ? `+${fixed}` : fixed;
}
