import { AuthForm } from "@/components/auth/AuthForm";

export const metadata = { title: "Sign in" };

export default function SignInPage() {
  return (
    <>
      <h1 className="text-[1.9rem] leading-tight">Sign in</h1>
      <p className="mt-3 text-[13.5px] leading-relaxed text-muted-foreground">
        Pick up where you left off.
      </p>
      <div className="mt-8">
        <AuthForm mode="sign-in" />
      </div>
    </>
  );
}
