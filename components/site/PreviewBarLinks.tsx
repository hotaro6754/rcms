"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function PreviewBarLinks() {
  const path = usePathname();
  return (
    <span className="flex flex-wrap gap-4">
      <Link href="/admin/site" className="underline underline-offset-4">
        Back to the website editor
      </Link>
      <a href={`/api/site/preview/exit?to=${encodeURIComponent(path)}`} className="underline underline-offset-4">
        Exit preview
      </a>
    </span>
  );
}
