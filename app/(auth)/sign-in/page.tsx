import { AuthForm } from "@/components/auth/AuthForm";

export const metadata = { title: "Sign in" };

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ reset?: string }> }) {
  const { reset } = await searchParams;
  return (
    <>
      <p className="text-data text-[11px] tracking-[0.14em] text-subtle">YOUR ACADEMY</p>
      <h1 className="mt-3 text-[clamp(2.2rem,3.4vw,2.9rem)] leading-[1.02]">Welcome back.</h1>
      <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">Pick up where you left off.</p>
      {reset && (
        <p role="status" className="mt-6 border-l-2 border-brand pl-3 text-[14px] text-foreground">
          Password updated. Sign in with the new one.
        </p>
      )}
      <div className="mt-10">
        <AuthForm mode="sign-in" />
      </div>
    </>
  );
}
