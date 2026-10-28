/** Claim amounts are stored in cents; cases are US claims, so dollars. */
export const usd = (cents: number) => "$" + (cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const PRIORITY_TONE: Record<string, string> = { HIGH: "red", MEDIUM: "amber", LOW: "grey" };
