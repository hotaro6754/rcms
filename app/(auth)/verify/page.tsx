import Link from "next/link";
import { MailCheck } from "lucide-react";

export const metadata = { title: "Confirm your email" };

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;

  return (
    <>
      <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-accent text-accent-foreground">
        <MailCheck className="h-5 w-5" aria-hidden />
      </span>

      <h1 className="mt-6 text-[1.9rem] leading-tight">Confirm your email</h1>

      <p className="mt-3 text-[13.5px] leading-relaxed text-muted-foreground">
        {email ? (
          <>
            A link is on its way to <span className="font-medium text-foreground">{email}</span>.
            Open it and your account is active.
          </>
        ) : (
          <>A confirmation link is on its way. Open it and your account is active.</>
        )}
      </p>

      <div className="mt-7 rounded-[var(--radius)] border border-border bg-card p-5">
        <p className="text-[13px] font-semibold">Nothing arrived?</p>
        <ul className="mt-3 flex flex-col gap-2 text-micro leading-relaxed text-muted-foreground">
          <li>Give it two minutes. Delivery is usually faster than that, but not always.</li>
          <li>Check spam and, on Gmail, the Promotions tab.</li>
          <li>Confirm the address you typed is the one you meant.</li>
        </ul>
      </div>

      <p className="mt-7 text-micro text-muted-foreground">
        Once confirmed,{" "}
        <Link href="/sign-in" className="font-medium text-primary hover:underline">
          sign in
        </Link>
        .
      </p>
    </>
  );
}
