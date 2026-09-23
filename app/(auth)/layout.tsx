import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-[1320px] items-center px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="text-data rounded-full bg-foreground px-2.5 py-1.5 text-[11px] font-semibold leading-none text-background">
              RCMS
            </span>
            <span className="text-[15px] font-semibold tracking-tight">
              Operations <span className="font-normal text-muted-foreground">Academy</span>
            </span>
          </Link>
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="w-full max-w-[26rem]">{children}</div>
      </main>
      <footer className="border-t border-border px-6 py-6">
        <p className="mx-auto max-w-[1320px] text-micro text-muted-foreground">
          By continuing you agree to the{" "}
          <Link href="/legal/terms" className="text-primary hover:underline">terms</Link> and{" "}
          <Link href="/legal/privacy" className="text-primary hover:underline">privacy policy</Link>.
        </p>
      </footer>
    </div>
  );
}
