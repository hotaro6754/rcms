import { NextResponse, type NextRequest } from "next/server";

/**
 * Passes the request path to server layouts (which cannot read it otherwise) so a layout can
 * route by area. This is navigation only: every page and action still authorises on the server.
 */
export function middleware(req: NextRequest) {
  const headers = new Headers(req.headers);
  headers.set("x-pathname", req.nextUrl.pathname);
  return NextResponse.next({ request: { headers } });
}

export const config = { matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"] };
