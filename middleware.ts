import { NextResponse, type NextRequest } from "next/server";
import { isPrivatePath } from "@/lib/seo";


/**
 * Passes the request path to server layouts (which cannot read it otherwise) so a layout can
 * route by area, and tells search engines not to index private areas (or anything, until
 * SITE_INDEXING=on). This is navigation only: every page and action still authorises on the server.
 */
export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const headers = new Headers(req.headers);
  headers.set("x-pathname", path);
  const res = NextResponse.next({ request: { headers } });
  if (process.env.SITE_INDEXING !== "on" || isPrivatePath(path)) res.headers.set("X-Robots-Tag", "noindex, nofollow");
  return res;
}

export const config = { matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"] };
