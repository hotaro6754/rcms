import { TwoFactorForm } from "@/components/auth/TwoFactorForm";

export const metadata = { title: "Two-step verification" };

export default function TwoFactorPage() {
  return (
    <>
      <p className="text-data text-[11px] tracking-[0.14em] text-subtle">ONE MORE STEP</p>
      <h1 className="mt-3 text-[clamp(2.2rem,3.4vw,2.9rem)] leading-[1.02]">Confirm it is you.</h1>
      <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">Your account uses two-step verification. Enter the current code from your authenticator app.</p>
      <div className="mt-10">
        <TwoFactorForm />
      </div>
    </>
  );
}
