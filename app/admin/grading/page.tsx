import Link from "next/link";
import { requirePagePermission, can } from "@/lib/actor";
import { prisma } from "@/lib/db";
import { PageHead } from "@/components/platform/PlatformShell";
import { Empty, Table, Td, when } from "@/components/admin/kit";
import { pendingGrading } from "@/lib/services/learning/attempts";

export const metadata = { title: "Grading" };

/**
 * Everything waiting for a person to mark: written answers and uploads in assessments, and
 * submitted Governance Labs reviews. Oldest first.
 */
export default async function GradingQueue() {
  const actor = await requirePagePermission(["assessment.grade", "labs.grade"]);
  const [attempts, labs] = await Promise.all([
    can(actor, "assessment.grade") ? pendingGrading() : Promise.resolve([]),
    can(actor, "labs.grade") ? prisma.labAttempt.count({ where: { state: "SUBMITTED" } }) : Promise.resolve(0),
  ]);
  return (
    <div className="mx-auto max-w-[1320px] px-6 py-10">
      <PageHead kicker="Assessment" title="Grading" lede="Written answers and uploaded assignments are never passed automatically. A reviewer marks each against its rubric; the learner is notified when it is done." />
      <div className="mt-8 flex flex-col gap-8">
        {can(actor, "assessment.grade") &&
          (attempts.length === 0 ? (
            <Empty title="No assessment attempts are waiting for marking." />
          ) : (
            <Table head={["Learner", "Course", "Assessment", "Attempt", "Submitted"]}>
              {attempts.map((a) => (
                <tr key={a.id}>
                  <Td>
                    <Link href={`/admin/grading/${a.id}`} className="font-medium hover:underline">
                      {a.user.name}
                    </Link>
                  </Td>
                  <Td>{a.quiz.lesson.module.program.name}</Td>
                  <Td>{a.quiz.title}</Td>
                  <Td>#{a.attemptNo}</Td>
                  <Td>{when(a.submittedAt, true)}</Td>
                </tr>
              ))}
            </Table>
          ))}
        {can(actor, "labs.grade") && (
          <p className="text-[14px]">
            Governance Labs: {labs} review{labs === 1 ? "" : "s"} waiting.{" "}
            <Link href="/admin/grading/labs" className="underline underline-offset-4">
              Open the labs grading queue
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
