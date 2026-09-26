import { AuthForm } from "@/components/auth/AuthForm";

export const metadata = { title: "Create your account" };

export default function SignUpPage() {
  return (
    <>
      <p className="text-data text-[11px] tracking-[0.14em] text-subtle">NEW HERE</p>
      <h1 className="mt-3 text-[clamp(2.2rem,3.4vw,2.9rem)] leading-[1.02]">Create your account.</h1>
      <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
        One account covers programs, materials, certificates, mentoring and the Governance Labs. Confirm your
        email address and you are ready to enrol.
      </p>
      <div className="mt-10">
        <AuthForm mode="sign-up" />
      </div>
    </>
  );
}
