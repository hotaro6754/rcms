import { draftMode } from "next/headers";
import { NextResponse } from "next/server";
import { can, getActor } from "@/lib/actor";
import { prisma } from "@/lib/db";
import { definitionFor } from "@/lib/services/site/pages";

/**
 * Turns on draft preview for the person's browser and opens the page. Only a Super
 * Administrator can preview; the pages check again before showing any draft.
 */
export async function GET(req: Request) {
  const actor = await getActor().catch(() => null);
  if (!can(actor, "site.edit")) return new NextResponse("Only a Super Administrator can preview website drafts.", { status: 403 });
  const key = new URL(req.url).searchParams.get("key") ?? "";
  const row = await prisma.sitePage.findUnique({ where: { key }, select: { custom: true, slug: true, title: true, archivedAt: true } });
  const def = row?.archivedAt ? null : definitionFor(key, row);
  if (!def) return new NextResponse("That page does not exist.", { status: 404 });
  (await draftMode()).enable();
  // A relative Location keeps the browser on the host it used (the server may listen on 0.0.0.0).
  return new NextResponse(null, { status: 303, headers: { Location: def.path } });
}
