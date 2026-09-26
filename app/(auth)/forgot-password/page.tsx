import { RequestReset } from "@/components/auth/PasswordRecovery";

export const metadata = { title: "Reset your password" };

export default function ForgotPasswordPage() {
  return (
    <>
      <p className="text-data text-[11px] tracking-[0.14em] text-subtle">ACCOUNT</p>
      <h1 className="mt-3 text-[clamp(2rem,3vw,2.6rem)] leading-[1.05]">Reset your password</h1>
      <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
        Give the address you signed up with and we will send a link to set a new one.
      </p>
      <div className="mt-10">
        <RequestReset />
      </div>
    </>
  );
}
