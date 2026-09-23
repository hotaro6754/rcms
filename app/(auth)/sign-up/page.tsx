import { AuthForm } from "@/components/auth/AuthForm";

export const metadata = { title: "Create your account" };

export default function SignUpPage() {
  return (
    <>
      <h1 className="text-[1.9rem] leading-tight">Create your account</h1>
      <p className="mt-3 text-[13.5px] leading-relaxed text-muted-foreground">
        One account covers programs, mentoring and the Governance Labs. You will need to
        confirm your email address before you can enrol.
      </p>
      <div className="mt-8">
        <AuthForm mode="sign-up" />
      </div>
    </>
  );
}
