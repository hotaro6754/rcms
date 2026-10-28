import Image from "next/image";
import lockup from "@/public/brand/rcmexcel-lockup.png";
import mark from "@/public/brand/rcmexcel-mark.png";
import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils";

/**
 * The RCMExcel logo: the rising-bars mark beside the name, drawn as one image so it is the
 * same everywhere. Inside an ink environment it turns white (globals.css, .brand-logo).
 * With hideRestOnSmall, narrow screens show the mark alone. Screen readers hear the name once:
 * only one of the two images is ever displayed.
 */
export function Wordmark({ className, size = "md", hideRestOnSmall = false }: { className?: string; size?: "sm" | "md" | "lg"; hideRestOnSmall?: boolean }) {
  const height = { sm: "h-5", md: "h-7", lg: "h-[3.2cqw]" }[size];
  return (
    <span className={cn("brand-logo inline-flex items-center", className)}>
      <Image src={lockup} alt={BRAND.name} className={cn("w-auto", height, hideRestOnSmall && "hidden sm:block")} />
      {hideRestOnSmall && <Image src={mark} alt={BRAND.name} className={cn("w-auto sm:hidden", height)} />}
    </span>
  );
}
