import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePagePermission, can } from "@/lib/actor";
import { prisma } from "@/lib/db";
import { PageHead } from "@/components/platform/PlatformShell";
import { ActionButton, ActionForm } from "@/components/admin/ActionForm";
import { Panel, Pill, StatusPill, TEXTAREA, when } from "@/components/admin/kit";
import { CaseEditor } from "@/components/sim/CaseEditor";
import { caseWorkflowAction } from "@/lib/actions/sims";
import { caseReadiness } from "@/lib/services/sims/cases";
import { CaseDefinition } from "@/lib/sim/definition";

export const metadata = { title: "Case" };

export default async function CaseAdmin({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requirePagePermission("content.view");
  const { id } = await params;
  const c = await prisma.simCase.findUnique({ where: { id }, include: { versions: { orderBy: { version: "desc" }, include: { _count: { select: { attempts: true } } } } } });
  if (!c) notFound();
  const [courses, competencies, problems, people] = await Promise.all([
    prisma.program.findMany({ where: { status: { not: "ARCHIVED" }, isTemplate: false }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.competency.findMany({ where: { status: { not: "RETIRED" } }, select: { code: true, name: true, status: true }, orderBy: { code: "asc" } }),
    caseReadiness(id),
    prisma.user.findMany({ where: { id: { in: [c.authorId, c.submittedById, c.reviewerId, ...c.versions.map((v) => v.reviewedById)].filter(Boolean) as string[] } }, select: { id: true, name: true } }),
  ]);
  const name = (uid: string | null) => (uid === "seed" ? "Seed data" : (people.find((p) => p.id === uid)?.name ?? "—"));
  const def = CaseDefinition.parse(c.draft);
  const editable = can(actor, "content.edit") && c.status !== "IN_REVIEW" && c.status !== "RETIRED";
  const reviewer = can(actor, "content.review.academic") && c.submittedById !== actor.id && c.authorId !== actor.id;

  return (
    <div className="mx-auto max-w-[1320px] px-6 py-8">
      <Link href="/admin/cases" className="text-micro text-muted-foreground hover:text-foreground">
        ← Cases
      </Link>
      <PageHead
        kicker="Case simulation"
        title={c.title}
        lede={
          <span className="flex flex-wrap items-center gap-2">
            <StatusPill status={c.status} />
            {c.hasDraftChanges && <Pill tone="amber">edits awaiting approval</Pill>}
            <Link href={`/admin/cases/${id}/preview`} className="text-[13px] underline underline-offset-4">
              Preview and test-score the draft
            </Link>
          </span>
        }
      />
      <p className="mt-2 text-micro text-muted-foreground">
        Author {name(c.authorId)} · submitted by {name(c.submittedById)} · last reviewed by {name(c.reviewerId)}
      </p>
      {c.reviewNote && <p className="mt-3 border-l-2 border-warning pl-3 text-[13.5px]">Reviewer note: {c.reviewNote}</p>}

      <div className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <CaseEditor id={c.id} lockVersion={c.lockVersion} initial={def} programId={c.programId} courses={courses} competencies={competencies} editable={editable} />

        <div className="flex flex-col gap-6 xl:sticky xl:top-6 xl:self-start">
          <Panel title="Workflow">
            {problems.length > 0 ? (
              <ul className="mb-4 flex list-disc flex-col gap-1 pl-5 text-[13px] text-danger">
                {problems.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            ) : (
              <p className="mb-4 text-[13px] text-success">Ready for review.</p>
            )}
            <div className="flex flex-wrap gap-2">
              {can(actor, "content.submit") && (c.status === "DRAFT" || (c.status === "PUBLISHED" && c.hasDraftChanges)) && (
                <ActionButton action={caseWorkflowAction} fields={{ id, op: "submit" }} variant="default">
                  Submit for review
                </ActionButton>
              )}
              {c.status === "IN_REVIEW" && (c.submittedById === actor.id || can(actor, "content.edit")) && (
                <ActionButton action={caseWorkflowAction} fields={{ id, op: "withdraw" }}>
                  Withdraw from review
                </ActionButton>
              )}
              {can(actor, "content.archive") && c.status !== "RETIRED" && (
                <ActionButton action={caseWorkflowAction} fields={{ id, op: "retire" }} variant="danger" confirm="Retire this case? Learners cannot start new attempts; attempts in progress can still be submitted.">
                  Retire
                </ActionButton>
              )}
              {can(actor, "content.archive") && c.status === "RETIRED" && (
                <ActionButton action={caseWorkflowAction} fields={{ id, op: "restore" }}>
                  Restore to draft
                </ActionButton>
              )}
            </div>
            {c.status === "IN_REVIEW" && reviewer && (
              <ActionForm action={caseWorkflowAction} className="mt-4 flex flex-col gap-2 border-t border-border pt-4">
                <input type="hidden" name="id" value={id} />
                <textarea name="note" rows={2} placeholder="Review note (required to request changes)" aria-label="Review note" className={TEXTAREA} />
                <p className="text-[12px] text-muted-foreground">Check the codes against the cited sources, that every party is synthetic and labelled fictional, and that the answer key is defensible.</p>
                <span className="flex gap-2">
                  <button name="op" value="approve" className="rounded-[3px] bg-primary px-3 py-1.5 text-[13px] text-primary-foreground">
                    Approve and publish
                  </button>
                  <button name="op" value="reject" className="rounded-[3px] border border-input px-3 py-1.5 text-[13px]">
                    Request changes
                  </button>
                </span>
              </ActionForm>
            )}
            {c.status === "IN_REVIEW" && !reviewer && <p className="mt-3 text-[12.5px] text-muted-foreground">A reviewer who did not write or submit this case must decide it.</p>}
          </Panel>
          <Panel title="Published versions">
            {c.versions.length === 0 ? (
              <p className="text-[13px] text-muted-foreground">Not published yet.</p>
            ) : (
              <ul className="flex flex-col gap-1.5 text-[13px]">
                {c.versions.map((v) => (
                  <li key={v.id} className="flex justify-between gap-2">
                    <span>
                      v{v.version} · {when(v.createdAt)} · reviewed by {name(v.reviewedById)}
                    </span>
                    <span className="text-muted-foreground">{v.retiredAt ? "retired" : `${v._count.attempts} attempts`}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
