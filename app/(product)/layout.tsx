import Link from "next/link";
import { Sidebar } from "@/components/product/Sidebar";
import { Topbar } from "@/components/product/Topbar";

/**
 * The operations console is teaching material: a worked example built around a fictional
 * practice with synthetic numbers. Every page carries that label so nobody mistakes it for a
 * client's data or for the Academy's own reporting (which lives in the Admin Control Center).
 */
export default function ProductLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <p role="note" className="border-b border-warning/40 bg-warning-bg px-4 py-2 text-[12.5px] leading-snug text-foreground">
          <strong className="font-semibold">Worked example.</strong> Meridian Cardiology Partners is a fictional practice and every figure here is
          synthetic, built for teaching RCM operations governance. No real patient, provider or payer data.{" "}
          <Link href="/catalog" className="underline underline-offset-4">
            See the courses that use it
          </Link>
          .
        </p>
        <Topbar />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
