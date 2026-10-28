import Link from "next/link";
import { notFound } from "next/navigation";
import type { VendorStatus } from "@prisma/client";
import { requirePagePermission, can } from "@/lib/actor";
import { prisma } from "@/lib/db";
import { PageHead } from "@/components/platform/PlatformShell";
import { ActionForm } from "@/components/admin/ActionForm";
import { BTN, Checkbox, dateInput, Field, FIELD, inr, Panel, Pill, StatusPill, TEXTAREA, when } from "@/components/admin/kit";
import { assignDeliverableAction, checklistAction, linkVendorUserAction, reviewDeliverableAction, updateVendorAction, uploadVendorDocAction, vendorPayoutRequestAction, vendorStatusAction } from "@/lib/actions/vendors";
import { LIFECYCLE, ONBOARDING, scorecard, VENDOR_TYPES } from "@/lib/services/vendors/vendors";

export const metadata = { title: "Vendor" };

export default async function VendorPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requirePagePermission("vendor.view");
  const { id } = await params;
  const v = await prisma.vendor.findUnique({
    where: { id },
    include: {
      members: { include: { user: { select: { name: true, email: true, lastLoginAt: true } } } },
      documents: { orderBy: { createdAt: "desc" } },
      deliverables: { orderBy: { createdAt: "desc" }, include: { submissions: { orderBy: { createdAt: "desc" }, take: 1 }, program: { select: { name: true } } } },
      invoices: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });
  if (!v) notFound();
  const [score, courses, payoutRequests] = await Promise.all([
    scorecard(id),
    prisma.program.findMany({ where: { status: { not: "ARCHIVED" } }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.approvalRequest.findMany({ where: { kind: "VENDOR_PAYOUT_CHANGE", targetId: id }, orderBy: { createdAt: "desc" }, take: 5, select: { id: true, status: true, summary: true, createdAt: true } }),
  ]);
  const manage = can(actor, "vendor.manage");
  const financial = can(actor, "vendor.view_financial");
  const checklist = (v.onboardingChecklist ?? {}) as Record<string, boolean>;
  const idx = LIFECYCLE.indexOf(v.status);
  const nextStatuses: VendorStatus[] = LIFECYCLE.filter((s, i) => i === idx + 1 || (s === "OFFBOARDING" && idx < LIFECYCLE.indexOf("OFFBOARDING")) || (s === "PERFORMANCE_REVIEW" && v.status === "RENEWAL") || (s === "ACTIVE" && ["PERFORMANCE_REVIEW", "RENEWAL"].includes(v.status)));

  return (
    <div className="mx-auto max-w-[1320px] px-6 py-8">
      <Link href="/admin/vendors" className="text-micro text-muted-foreground hover:text-foreground">
        ← Vendors
      </Link>
      <PageHead kicker={`${v.code} · ${v.type.replace(/_/g, " ").toLowerCase()}`} title={v.legalName} lede={<span className="flex flex-wrap items-center gap-2"><StatusPill status={v.status} /> risk {v.riskRating} · data access {v.dataAccessClass.replace(/_/g, " ")}</span>} />

      <dl className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-6">
        {[
          ["Deliverables", score.deliverables],
          ["On time", score.timeliness === null ? "—" : `${score.timeliness}%`],
          ["Accepted", score.acceptance === null ? "—" : `${score.acceptance}%`],
          ["Rework rounds", score.rework],
          ["Quality (1–5)", score.quality ?? "—"],
          ["Overdue", score.overdue],
        ].map(([l, val]) => (
          <div key={String(l)} className="border-t-2 border-foreground pt-2">
            <dt className="text-data text-[10.5px] tracking-[0.1em] text-subtle">{String(l).toUpperCase()}</dt>
            <dd className="font-serif-display mt-1 text-[1.8rem] leading-none">{val}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-6">
          <Panel title="Deliverables">
            <ul className="divide-y divide-border">
              {v.deliverables.length === 0 && <li className="py-2 text-micro text-muted-foreground">None assigned.</li>}
              {v.deliverables.map((d) => (
                <li key={d.id} className="py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[14px] font-medium">{d.title}</span>
                    <StatusPill status={d.status} />
                    <span className="text-micro text-muted-foreground">
                      due {when(d.dueDate)} · {inr(d.fee)}
                      {d.program ? ` · ${d.program.name}` : ""}
                    </span>
                  </div>
                  {d.submissions[0] && (
                    <p className="mt-1 text-[12.5px]">
                      Latest submission {when(d.submissions[0].createdAt, true)}
                      {d.submissions[0].fileKey && (
                        <>
                          {" · "}
                          <a href={`/api/vendor-files/submission/${d.submissions[0].id}`} className="underline">
                            {d.submissions[0].fileName}
                          </a>
                        </>
                      )}
                      {d.submissions[0].link && (
                        <>
                          {" · "}
                          <a href={d.submissions[0].link} target="_blank" rel="noopener noreferrer nofollow" className="underline">
                            link
                          </a>
                        </>
                      )}
                      {d.submissions[0].note && <span className="block text-muted-foreground">{d.submissions[0].note}</span>}
                    </p>
                  )}
                  {manage && d.status === "SUBMITTED" && (
                    <ActionForm action={reviewDeliverableAction} className="mt-2 flex flex-col gap-2">
                      <input type="hidden" name="id" value={d.id} />
                      <input type="hidden" name="vendorId" value={v.id} />
                      <textarea name="comment" required rows={2} placeholder="Review comment for the vendor" aria-label="Review comment" className={TEXTAREA} />
                      <span className="flex flex-wrap items-center gap-2">
                        <select name="qualityScore" aria-label="Quality score" className="min-h-8 rounded-[3px] border border-input bg-card px-2 text-[12.5px]">
                          <option value="">Quality…</option>
                          {[1, 2, 3, 4, 5].map((n) => (
                            <option key={n}>{n}</option>
                          ))}
                        </select>
                        <button name="decision" value="ACCEPTED" className="rounded-[3px] bg-primary px-3 py-1.5 text-[12.5px] text-primary-foreground">
                          Accept
                        </button>
                        <button name="decision" value="CHANGES_REQUESTED" className="rounded-[3px] border border-input px-3 py-1.5 text-[12.5px]">
                          Request changes
                        </button>
                        <button name="decision" value="REJECTED" className="rounded-[3px] border border-danger/40 px-3 py-1.5 text-[12.5px] text-danger">
                          Reject
                        </button>
                      </span>
                    </ActionForm>
                  )}
                </li>
              ))}
            </ul>
            {manage && (
              <ActionForm action={assignDeliverableAction} className="mt-4 grid gap-2 border-t border-border pt-4 sm:grid-cols-4" resetOnSuccess>
                <input type="hidden" name="vendorId" value={v.id} />
                <input name="title" required placeholder="Deliverable" aria-label="Deliverable title" className={`${FIELD} sm:col-span-2`} />
                <input name="dueDate" type="date" aria-label="Due date" className={FIELD} />
                <input name="fee" type="number" min="0" placeholder="Fee ₹" aria-label="Fee in rupees" className={FIELD} />
                <select name="programId" aria-label="Course" className={`${FIELD} sm:col-span-2`}>
                  <option value="">No specific course</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <input name="description" placeholder="Description" aria-label="Description" className={FIELD} />
                <button className={`${BTN} w-fit`}>Assign</button>
              </ActionForm>
            )}
          </Panel>

          <Panel title="Profile">
            <ActionForm action={updateVendorAction} className="grid gap-3 sm:grid-cols-2" success="Saved.">
              <input type="hidden" name="id" value={v.id} />
              <fieldset disabled={!manage} className="contents">
                <Field label="Legal name" htmlFor="ln">
                  <input id="ln" name="legalName" defaultValue={v.legalName} required className={FIELD} />
                </Field>
                <Field label="Trading name" htmlFor="tn">
                  <input id="tn" name="tradingName" defaultValue={v.tradingName ?? ""} className={FIELD} />
                </Field>
                <Field label="Type" htmlFor="ty">
                  <select id="ty" name="type" defaultValue={v.type} className={FIELD}>
                    {VENDOR_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t.replace(/_/g, " ").toLowerCase()}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Country" htmlFor="co">
                  <input id="co" name="country" defaultValue={v.country ?? ""} className={FIELD} />
                </Field>
                <Field label="Contact name" htmlFor="cn">
                  <input id="cn" name="contactName" defaultValue={v.contactName ?? ""} className={FIELD} />
                </Field>
                <Field label="Contact email" htmlFor="ce">
                  <input id="ce" name="contactEmail" defaultValue={v.contactEmail ?? ""} className={FIELD} />
                </Field>
                <Field label="Services" htmlFor="sv" className="sm:col-span-2">
                  <textarea id="sv" name="services" rows={2} defaultValue={v.services ?? ""} className={TEXTAREA} />
                </Field>
                <Field label="Commercial model" htmlFor="cm">
                  <input id="cm" name="commercialModel" defaultValue={v.commercialModel ?? ""} className={FIELD} placeholder="Fee per module" />
                </Field>
                <Field label="Compliance classification" htmlFor="cc">
                  <input id="cc" name="complianceClass" defaultValue={v.complianceClass ?? ""} className={FIELD} />
                </Field>
                <Field label="Risk rating" htmlFor="rr">
                  <select id="rr" name="riskRating" defaultValue={v.riskRating} className={FIELD}>
                    <option>low</option>
                    <option>medium</option>
                    <option>high</option>
                  </select>
                </Field>
                <Field label="Data access" htmlFor="da">
                  <select id="da" name="dataAccessClass" defaultValue={v.dataAccessClass} className={FIELD}>
                    <option value="none">None</option>
                    <option value="content_only">Content only</option>
                    <option value="learner_aggregate">Aggregate learner data</option>
                    <option value="learner_personal">Personal learner data</option>
                  </select>
                </Field>
                <Field label="Contract start" htmlFor="cs">
                  <input id="cs" name="contractStart" type="date" defaultValue={dateInput(v.contractStart)} className={FIELD} />
                </Field>
                <Field label="Contract end" htmlFor="cend">
                  <input id="cend" name="contractEnd" type="date" defaultValue={dateInput(v.contractEnd)} className={FIELD} />
                </Field>
                <Field label="Portal access expires" htmlFor="ax">
                  <input id="ax" name="accessExpiresAt" type="date" defaultValue={dateInput(v.accessExpiresAt)} className={FIELD} />
                </Field>
              </fieldset>
              {manage && <button className={`${BTN} w-fit`}>Save</button>}
            </ActionForm>
          </Panel>
        </div>

        <div className="flex flex-col gap-6">
          <Panel title="Lifecycle">
            <ol className="flex flex-wrap gap-1">
              {LIFECYCLE.map((s, i) => (
                <li key={s} className={`text-data rounded-[2px] px-1.5 py-0.5 text-[10px] ${i === idx ? "bg-foreground text-background" : i < idx ? "bg-success-bg text-success" : "bg-secondary text-subtle"}`}>
                  {s.replace(/_/g, " ")}
                </li>
              ))}
            </ol>
            {(manage || can(actor, "vendor.approve")) && nextStatuses.length > 0 && (
              <ActionForm action={vendorStatusAction} className="mt-3 flex flex-col gap-2">
                <input type="hidden" name="id" value={v.id} />
                <select name="status" aria-label="Move to" className={FIELD}>
                  {nextStatuses.map((s) => (
                    <option key={s} value={s}>
                      Move to {s.replace(/_/g, " ").toLowerCase()}
                    </option>
                  ))}
                </select>
                <input name="reason" required placeholder="Reason" aria-label="Reason" className={FIELD} />
                <button className="w-fit rounded-[3px] border border-input px-3 py-1.5 text-[13px]">Update status</button>
              </ActionForm>
            )}
          </Panel>
          <Panel title="Onboarding controls">
            <ActionForm action={checklistAction} className="flex flex-col gap-1.5">
              <input type="hidden" name="id" value={v.id} />
              {ONBOARDING.map(([k, label]) => (
                <Checkbox key={k} name={k} label={label} defaultChecked={!!checklist[k]} />
              ))}
              {manage && <button className="mt-2 w-fit rounded-[3px] border border-input px-3 py-1.5 text-[13px]">Save checklist</button>}
            </ActionForm>
          </Panel>
          <Panel title="Payout details">
            {financial ? (
              <p className="text-[13.5px]">
                Reference: {v.payoutReference ?? "not set"} · account ending {v.payoutLast4 ?? "—"} · tax ID ending {v.taxIdLast4 ?? "—"}
                {v.payoutChangedAt && <span className="block text-[12px] text-muted-foreground">Changed {when(v.payoutChangedAt, true)}</span>}
              </p>
            ) : (
              <p className="text-[13px] text-muted-foreground">{v.payoutLast4 ? `Account ending ${v.payoutLast4}. ` : "Not set. "}Full payout references are visible to finance only.</p>
            )}
            <ul className="mt-2 text-[12px] text-muted-foreground">
              {payoutRequests.map((r) => (
                <li key={r.id}>
                  {when(r.createdAt)} · {r.status.toLowerCase()} · {r.summary}
                </li>
              ))}
            </ul>
            {can(actor, "vendor.payout.request") && (
              <details className="mt-3">
                <summary className="cursor-pointer text-[12.5px] underline">Request a payout change</summary>
                <ActionForm action={vendorPayoutRequestAction} className="mt-2 flex flex-col gap-2" success="Requested. An independent finance reviewer must approve it.">
                  <input type="hidden" name="vendorId" value={v.id} />
                  <input name="payoutReference" required placeholder="Provider payout reference" aria-label="Payout reference" className={FIELD} />
                  <input name="payoutLast4" required pattern="\d{4}" placeholder="Last 4 of account" aria-label="Last four digits" className={FIELD} />
                  <input name="taxIdLast4" placeholder="Last 4 of tax ID (optional)" aria-label="Tax ID last four" className={FIELD} />
                  <input name="reason" required placeholder="Reason and how it was verified" aria-label="Reason" className={FIELD} />
                  <button className="w-fit rounded-[3px] border border-input px-3 py-1.5 text-[13px]">Request</button>
                </ActionForm>
                <p className="mt-1 text-[11.5px] text-muted-foreground">Never type full account or tax numbers here. Verify changes by calling the vendor on a number already on file.</p>
              </details>
            )}
          </Panel>
          <Panel title="Portal contacts">
            <ul className="text-[13px]">
              {v.members.map((m) => (
                <li key={m.id}>
                  {m.user.name} · {m.user.email} · last sign-in {when(m.user.lastLoginAt)}
                </li>
              ))}
              {v.members.length === 0 && <li className="text-muted-foreground">No portal contacts.</li>}
            </ul>
            {manage && (
              <ActionForm action={linkVendorUserAction} className="mt-2 flex gap-1.5">
                <input type="hidden" name="id" value={v.id} />
                <input name="email" type="email" required placeholder="Contact's account email" aria-label="Contact email" className={FIELD} />
                <button className="rounded-[3px] border border-input px-3 text-[13px]">Link</button>
              </ActionForm>
            )}
          </Panel>
          <Panel title="Contracts and documents">
            <ul className="text-[13px]">
              {v.documents.map((d) => (
                <li key={d.id} className="flex flex-wrap items-center gap-2 py-1">
                  <a href={`/api/vendor-files/document/${d.id}`} className="underline">
                    {d.title}
                  </a>
                  <Pill>{d.kind}</Pill>
                  {d.expiresAt && <span className={d.expiresAt < new Date() ? "text-danger" : "text-muted-foreground"}>expires {when(d.expiresAt)}</span>}
                  {!d.visibleToVendor && <Pill tone="amber">internal</Pill>}
                </li>
              ))}
            </ul>
            {manage && (
              <ActionForm action={uploadVendorDocAction} className="mt-3 flex flex-col gap-2" resetOnSuccess>
                <input type="hidden" name="vendorId" value={v.id} />
                <input name="title" required placeholder="Title" aria-label="Document title" className={FIELD} />
                <select name="kind" aria-label="Document kind" className={FIELD}>
                  {["contract", "nda", "tax", "insurance", "security", "coi", "other"].map((k) => (
                    <option key={k}>{k}</option>
                  ))}
                </select>
                <input name="expiresAt" type="date" aria-label="Expires" className={FIELD} />
                <input name="file" type="file" required aria-label="File" className="text-[13px]" />
                <Checkbox name="visibleToVendor" label="Visible to the vendor" defaultChecked />
                <button className="w-fit rounded-[3px] border border-input px-3 py-1.5 text-[13px]">Upload</button>
              </ActionForm>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
