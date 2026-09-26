import { ResetPassword } from "@/components/auth/PasswordRecovery";

export const metadata = { title: "Set a new password" };

/** Landing page for the emailed reset link: better-auth appends ?token=… or ?error=INVALID_TOKEN. */
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const { token, error } = await searchParams;
  return (
    <>
      <p className="text-data text-[11px] tracking-[0.14em] text-subtle">ACCOUNT</p>
      <h1 className="mt-3 text-[clamp(2rem,3vw,2.6rem)] leading-[1.05]">Set a new password</h1>
      <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
        Choose one you have not used here before. Setting it signs you out everywhere else.
      </p>
      <div className="mt-10">
        <ResetPassword token={token ?? null} invalid={!!error} />
      </div>
    </>
  );
}
