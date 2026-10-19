import { draftMode } from "next/headers";
import { NextResponse } from "next/server";

/** Turns draft preview off and returns to the page (same-site paths only). */
export async function GET(req: Request) {
  (await draftMode()).disable();
  const to = new URL(req.url).searchParams.get("to") ?? "/";
  const safe = to.startsWith("/") && !to.startsWith("//") ? to : "/";
  return new NextResponse(null, { status: 303, headers: { Location: safe } });
}
