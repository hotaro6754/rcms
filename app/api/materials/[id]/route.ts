import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { getSession } from "@/lib/rbac";
import { isAvailable, isLink, readStored } from "@/lib/storage";

const STAFF = new Set(["TRAINER", "ADMIN", "OWNER"]);

/**
 * Download a course material. The only way a student reaches a file: signed in, verified,
 * and enrolled (active or completed) on the program the material belongs to. Staff can
 * open anything. Every download is audited.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  const user = session?.user as { id: string; emailVerified: boolean; role?: string } | undefined;
  if (!user?.emailVerified) return new NextResponse("Sign in to download course materials.", { status: 401 });

  const { id } = await params;
  const res = await prisma.resource.findUnique({
    where: { id },
    include: { lesson: { select: { state: true, module: { select: { programId: true } } } } },
  });
  if (!res) return new NextResponse("Not found.", { status: 404 });

  if (!STAFF.has(user.role ?? "STUDENT")) {
    const enrolment = await prisma.enrolment.findUnique({
      where: { userId_programId: { userId: user.id, programId: res.lesson.module.programId } },
      select: { state: true },
    });
    const enrolled = enrolment && (enrolment.state === "ACTIVE" || enrolment.state === "COMPLETED");
    if (!enrolled || res.lesson.state !== "PUBLISHED") {
      return new NextResponse("This material belongs to a program you are not enrolled on.", { status: 403 });
    }
  }

  if (!isAvailable(res.fileKey)) {
    return new NextResponse("This material is listed but has not been uploaded yet.", { status: 404 });
  }

  await audit({ actorId: user.id, action: "download", entity: "Resource", entityId: res.id, after: { title: res.title } });

  if (isLink(res.fileKey)) return NextResponse.redirect(res.fileKey, 302);

  const body = await readStored(res.fileKey);
  const ext = res.fileKey.split(".").pop();
  const name = `${res.title.replace(/[^\w\- ]+/g, "").trim() || "material"}${ext ? `.${ext}` : ""}`;
  return new NextResponse(new Uint8Array(body), {
    headers: {
      "Content-Type": res.mimeType,
      "Content-Length": String(body.length),
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
