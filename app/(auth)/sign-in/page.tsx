import { Suspense } from "react";
import { AuthForm } from "@/components/auth/AuthForm";
import { comingSoon } from "@/lib/launch";

export const metadata = { title: "Sign in" };

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ reset?: string }> }) {
  const { reset } = await searchParams;
  const closed = comingSoon();
  return (
    <>
      <p className="x-kicker">{closed ? "Staff only" : "Welcome back"}</p>
      <h1 className="x-display mt-2 text-[40px]">{closed ? "Admin sign in" : "Sign in"}</h1>
      <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
        {closed ? "The Academy is not open yet. Only administrators can sign in." : "Use the email and password for your RCMExcel account."}
      </p>
      {reset && (
        <p role="status" className="mt-6 border-l-2 border-brand pl-3 text-[14px] text-foreground">
          Password updated. Sign in with the new one.
        </p>
      )}
      <div className="mt-7">
        <Suspense>
          <AuthForm mode="sign-in" allowSignUp={!closed} home={closed ? "/admin" : "/academy"} />
        </Suspense>
      </div>
    </>
  );
}
