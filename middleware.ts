import { NextResponse, type NextRequest } from "next/server";
import { isPrivatePath } from "@/lib/seo";
import { comingSoon, openDuringLockdown } from "@/lib/launch";

/**
 * Passes the request path to server layouts (which cannot read it otherwise) so a layout can
 * route by area, and tells search engines not to index private areas (or anything, until
 * SITE_INDEXING=on). This is navigation only: every page and action still authorises on the server.
 *
 * Before launch (lib/launch.ts) every page outside the admin and staff sign-in is answered
 * with the coming-soon page, at the address that was asked for, so nothing else is visible.
 */
export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const closed = comingSoon();

  if (closed && !openDuringLockdown(path)) {
    const url = req.nextUrl.clone();
    url.pathname = "/coming-soon";
    url.search = "";
    const res = NextResponse.rewrite(url);
    res.headers.set("X-Robots-Tag", "noindex, nofollow");
    res.headers.set("Cache-Control", "no-store");
    return res;
  }
  if (!closed && path === "/coming-soon") return NextResponse.redirect(new URL("/", req.url));

  const headers = new Headers(req.headers);
  headers.set("x-pathname", path);
  const res = NextResponse.next({ request: { headers } });
  if (closed || process.env.SITE_INDEXING !== "on" || isPrivatePath(path)) res.headers.set("X-Robots-Tag", "noindex, nofollow");
  return res;
}

export const config = { matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"] };
