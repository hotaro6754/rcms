import Link from "next/link";
import type { LinkValue } from "@/lib/site/fields";

/**
 * A link whose text and destination come from the website editor. Internal paths use client
 * navigation; other addresses open normally. An empty label hides the link.
 */
export function SiteLink({
  link,
  className,
  children,
  ...rest
}: { link: LinkValue; className?: string; children?: React.ReactNode } & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "className" | "children">) {
  if (!link.label.trim() && !children) return null;
  const body = children ?? link.label;
  if (link.href.startsWith("/") && !link.href.startsWith("//")) {
    return (
      <Link href={link.href} className={className} {...rest}>
        {body}
      </Link>
    );
  }
  const external = link.href.startsWith("https://");
  return (
    <a href={link.href} className={className} {...(external ? { target: "_blank", rel: "noreferrer" } : {})} {...rest}>
      {body}
    </a>
  );
}
