import Link from "next/link";
import type { LibraryKind, LibraryStatus } from "@prisma/client";
import { requirePagePermission, can } from "@/lib/actor";
import { prisma } from "@/lib/db";
import { PageHead } from "@/components/platform/PlatformShell";
import { ActionForm } from "@/components/admin/ActionForm";
import { BTN, BTN_OUTLINE, Empty, Field, FIELD, Pill, StatusPill, Table, Td, TEXTAREA, when } from "@/components/admin/kit";
import { createEntryAction } from "@/lib/actions/library";
import { LIBRARY_KINDS, LIBRARY_LABEL } from "@/lib/services/cms/library";

export const metadata = { title: "Library" };

const STATUSES: LibraryStatus[] = ["DRAFT", "IN_REVIEW", "PUBLISHED", "ARCHIVED"];

/** Glossary, process library, case studies, leadership toolkit and resources: drafted here, reviewed, then public. */
export default async function LibraryAdmin({ searchParams }: { searchParams: Promise<{ kind?: string; status?: string; q?: string }> }) {
  const actor = await requirePagePermission("content.view");
  const sp = await searchParams;
  const kind = LIBRARY_KINDS.includes(sp.kind as LibraryKind) ? (sp.kind as LibraryKind) : undefined;
  const status = STATUSES.includes(sp.status as LibraryStatus) ? (sp.status as LibraryStatus) : undefined;
  const q = sp.q?.trim();
  const [rows, levels] = await Promise.all([
    prisma.libraryEntry.findMany({ where: { ...(kind ? { kind } : {}), ...(status ? { status } : {}), ...(q ? { title: { contains: q } } : {}) }, orderBy: [{ status: "asc" }, { title: "asc" }], take: 300 }),
    prisma.learningLevel.findMany({ where: { status: { not: "ARCHIVED" } }, orderBy: { sequence: "asc" }, select: { id: true, name: true } }),
  ]);
  const now = new Date();
  return (
    <div className="mx-auto max-w-[1320px] px-6 py-10">
      <PageHead kicker="Learning" title="Library" lede="Reference content for the public site: glossary, process library, case studies, leadership toolkit and resources. Every entry is approved by a reviewer other than the person who submitted it, and the public only ever sees the approved version." />
      <form className="mt-8 flex flex-wrap items-end gap-2" role="search">
        <select name="kind" defaultValue={kind ?? ""} aria-label="Kind" className={`${FIELD} w-auto`}>
          <option value="">All kinds</option>
          {LIBRARY_KINDS.map((k) => (
            <option key={k} value={k}>
              {LIBRARY_LABEL[k]}
            </option>
          ))}
        </select>
        <select name="status" defaultValue={status ?? ""} aria-label="Status" className={`${FIELD} w-auto`}>
          <option value="">Any status</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replace("_", " ").toLowerCase()}
            </option>
          ))}
        </select>
        <input name="q" defaultValue={q} placeholder="Title" aria-label="Search titles" className={`${FIELD} w-56`} />
        <button className={BTN_OUTLINE}>Filter</button>
      </form>
      <div className="mt-6">
        {rows.length === 0 ? (
          <Empty title="No entries match." />
        ) : (
          <Table head={["Entry", "Kind", "Status", "Last reviewed", "Next review"]} minWidth="56rem">
            {rows.map((r) => (
              <tr key={r.id}>
                <Td>
                  <Link href={`/admin/content/library/${r.id}`} className="font-medium hover:underline">
                    {r.title}
                  </Link>
                  {r.hasDraftChanges && <Pill tone="amber" className="ml-2">unapproved edits</Pill>}
                </Td>
                <Td>{LIBRARY_LABEL[r.kind]}</Td>
                <Td>
                  <StatusPill status={r.status} />
                </Td>
                <Td>{when(r.lastReviewedAt)}</Td>
                <Td className={r.nextReviewAt && r.nextReviewAt < now && r.status === "PUBLISHED" ? "text-danger" : ""}>{when(r.nextReviewAt)}</Td>
              </tr>
            ))}
          </Table>
        )}
      </div>
      {can(actor, "content.create") && (
        <ActionForm action={createEntryAction} className="mt-8 grid gap-3 rounded-[var(--radius)] border border-dashed border-input bg-card px-5 py-4 sm:grid-cols-3">
          <Field label="Kind" htmlFor="e-kind">
            <select id="e-kind" name="kind" className={FIELD}>
              {LIBRARY_KINDS.map((k) => (
                <option key={k} value={k}>
                  {LIBRARY_LABEL[k]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Title" htmlFor="e-title" className="sm:col-span-2">
            <input id="e-title" name="title" required className={FIELD} />
          </Field>
          <Field label="Summary" htmlFor="e-sum" className="sm:col-span-3">
            <textarea id="e-sum" name="summary" rows={2} required className={TEXTAREA} />
          </Field>
          <Field label="Level (optional)" htmlFor="e-level">
            <select id="e-level" name="levelId" className={FIELD}>
              <option value="">Any level</option>
              {levels.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </Field>
          <div className="flex items-end sm:col-span-2">
            <button className={BTN}>Create draft</button>
          </div>
        </ActionForm>
      )}
    </div>
  );
}
