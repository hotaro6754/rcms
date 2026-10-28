import Link from "next/link";
import { requirePagePermission, can } from "@/lib/actor";
import { prisma } from "@/lib/db";
import { PageHead } from "@/components/platform/PlatformShell";
import { Empty, StatusPill, Table, Td, when } from "@/components/admin/kit";
import { STATUS_LABEL } from "@/lib/services/cms/core";

export const metadata = { title: "Review queue" };

/**
 * Everything waiting on a decision, oldest first, plus the content whose scheduled review
 * date has passed (blueprint §7: every module has a next-review date).
 */
export default async function ReviewQueue() {
  const actor = await requirePagePermission("content.view");
  const [waiting, overdue] = await Promise.all([
    prisma.program.findMany({
      where: { status: { in: ["ACADEMIC_REVIEW", "COMPLIANCE_REVIEW", "APPROVED", "SCHEDULED"] } },
      orderBy: { updatedAt: "asc" },
      select: { id: true, name: true, status: true, updatedAt: true, scheduledFor: true, academicReviewerId: true, complianceReviewerId: true, learningLevel: { select: { displayTitle: true } } },
    }),
    prisma.program.findMany({
      where: { reviewDate: { lt: new Date() }, status: { not: "ARCHIVED" } },
      orderBy: { reviewDate: "asc" },
      select: { id: true, name: true, status: true, reviewDate: true },
    }),
  ]);

  const mine = (c: (typeof waiting)[number]) =>
    (c.status === "ACADEMIC_REVIEW" && can(actor, "content.review.academic") && (!c.academicReviewerId || c.academicReviewerId === actor.id)) ||
    (c.status === "COMPLIANCE_REVIEW" && can(actor, "content.review.compliance") && (!c.complianceReviewerId || c.complianceReviewerId === actor.id)) ||
    (c.status === "APPROVED" && can(actor, "content.publish"));

  return (
    <div className="mx-auto max-w-[1320px] px-6 py-10">
      <PageHead kicker="Learning management" title="Review queue" lede="Courses waiting for academic review, compliance review or publication. Rows marked “yours” are ones your role can act on." />
      <div className="mt-8 flex flex-col gap-10">
        {waiting.length === 0 ? (
          <Empty title="Nothing is waiting for review." />
        ) : (
          <Table head={["Course", "Level", "Stage", "Waiting since", ""]}>
            {waiting.map((c) => (
              <tr key={c.id}>
                <Td>
                  <Link href={`/admin/content/courses/${c.id}`} className="font-medium hover:underline">
                    {c.name}
                  </Link>
                </Td>
                <Td>{c.learningLevel?.displayTitle ?? "—"}</Td>
                <Td>
                  <StatusPill status={c.status} label={STATUS_LABEL[c.status]} />
                  {c.scheduledFor && <span className="ml-2 text-micro text-muted-foreground">{when(c.scheduledFor, true)}</span>}
                </Td>
                <Td>{when(c.updatedAt, true)}</Td>
                <Td>{mine(c) && <span className="text-data text-[10.5px] text-success">YOURS</span>}</Td>
              </tr>
            ))}
          </Table>
        )}

        <section>
          <h2 className="text-[1.1rem]">Overdue content reviews</h2>
          <p className="mt-1 text-micro text-muted-foreground">Courses whose next-review date has passed. Re-check them against current official guidance and set a new date.</p>
          <div className="mt-3">
            {overdue.length === 0 ? (
              <Empty title="No overdue reviews." />
            ) : (
              <Table head={["Course", "Status", "Review was due"]}>
                {overdue.map((c) => (
                  <tr key={c.id}>
                    <Td>
                      <Link href={`/admin/content/courses/${c.id}`} className="hover:underline">
                        {c.name}
                      </Link>
                    </Td>
                    <Td>
                      <StatusPill status={c.status} label={STATUS_LABEL[c.status]} />
                    </Td>
                    <Td className="text-danger">{when(c.reviewDate)}</Td>
                  </tr>
                ))}
              </Table>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
