import Link from "next/link";
import { Wordmark } from "@/components/brand/Wordmark";
import { NOINDEX } from "@/lib/seo";

/** Signed-in and sign-in pages are kept out of search engines. */
export const metadata = NOINDEX;

const INSIDE = [
  ["Three levels", "Trainee, Professional and Leadership: from your first revenue cycle role to running operations."],
  ["Lessons and materials", "Written from the floor, with the SOPs and templates that go with them."],
  ["Certificates", "Issued when the work is done, with a serial anyone can verify."],
];

/**
 * Sign-in, sign-up and verification. Split: an ink panel that says where the account leads,
 * and the form on the desk beside it. On phones the panel folds to a single line above.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="editorial grid min-h-dvh bg-background lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      <aside className="env-ink relative hidden flex-col justify-between bg-background px-12 py-10 text-foreground lg:flex xl:px-16">
        <Link href="/" className="flex items-baseline gap-2.5">
          <Wordmark />
        </Link>

        <div>
          <p className="font-serif-display text-[clamp(2.6rem,4.4vw,4.4rem)] leading-[0.98] tracking-[-0.025em]">
            From RCM <em>beginner.</em>
            <br />
            To operations <em>leader.</em>
          </p>
          <dl className="mt-14 max-w-[34rem] border-t border-border">
            {INSIDE.map(([k, v]) => (
              <div key={k} className="grid grid-cols-[11rem_minmax(0,1fr)] gap-6 border-b border-border py-4">
                <dt className="text-data pt-0.5 text-[10.5px] tracking-[0.12em] text-subtle">{k.toUpperCase()}</dt>
                <dd className="text-[14px] leading-relaxed text-muted-foreground">{v}</dd>
              </div>
            ))}
          </dl>
        </div>

        <p className="text-data text-[10.5px] tracking-[0.1em] text-subtle">
          TRAINING DATA ONLY · NO REAL PATIENT, PROVIDER OR PAYER INFORMATION
        </p>
      </aside>

      <div className="flex min-h-dvh flex-col">
        <header className="flex h-14 items-center justify-between border-b border-border px-6 lg:border-b-0 lg:px-12">
          <Link href="/" className="flex items-baseline gap-2.5 lg:invisible">
            <Wordmark />
          </Link>
          <Link href="/" className="text-data text-[11px] tracking-[0.1em] text-subtle hover:text-foreground">
            ← THE SITE
          </Link>
        </header>
        <main className="flex flex-1 items-center justify-center px-6 py-14">
          <div className="w-full max-w-[25rem]">{children}</div>
        </main>
        <footer className="px-6 pb-8 lg:px-12">
          <p className="text-[12.5px] text-subtle">
            By continuing you agree to the{" "}
            <Link href="/legal/terms" className="underline underline-offset-4 hover:text-foreground">
              terms
            </Link>{" "}
            and{" "}
            <Link href="/legal/privacy" className="underline underline-offset-4 hover:text-foreground">
              privacy policy
            </Link>
            .
          </p>
        </footer>
      </div>
    </div>
  );
}
