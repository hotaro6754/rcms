import Link from "next/link";
import type { AccountStatus } from "@prisma/client";
import { requirePermission, can } from "@/lib/actor";
import { prisma } from "@/lib/db";
import { PageHead } from "@/components/platform/PlatformShell";
import { ActionButton, ActionForm } from "@/components/admin/ActionForm";
import { BTN, BTN_OUTLINE, Checkbox, dateInput, Field, FIELD, inr, Panel, Pill, StatusPill, Table, Td, TEXTAREA, when } from "@/components/admin/kit";
import { addNoteAction, editProfileAction, enrolmentStateAction, extendAccessAction, grantEnrolmentAction, requestProgressResetAction, resendVerificationAction, resetAuthAction, setStatusAction } from "@/lib/actions/subscribers";
import { profile } from "@/lib/services/people/subscribers";

export const metadata = { title: "Subscriber" };

const SETTABLE: AccountStatus[] = ["ACTIVE", "SUSPENDED", "DEACTIVATED", "ARCHIVED", "CANCELLED", "COMPLETED"];

export default async function SubscriberProfile({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requirePermission("subscriber.view");
  const { id } = await params;
  const u = await profile(actor, id);
  const courses = await prisma.program.findMany({ where: { status: { not: "ARCHIVED" }, publishedVersionId: { not: null } }, select: { id: true, name: true }, orderBy: { name: "asc" } });
  const enrolledIds = new Set(u.enrolments.filter((e) => e.state === "ACTIVE" || e.state === "COMPLETED").map((e) => e.programId));
  const pendingResets = await prisma.approvalRequest.findMany({ where: { kind: "PROGRESS_RESET", targetId: id, status: "PENDING" }, select: { id: true, summary: true } });

  return (
    <div className="mx-auto max-w-[1320px] px-6 py-8">
      <Link href="/admin/subscribers" className="text-micro text-muted-foreground hover:text-foreground">
        ← Directory
      </Link>
      <PageHead
        kicker={`Account ${u.id.slice(0, 8)} · registered ${when(u.createdAt)}`}
        title={u.name}
        lede={
          <span className="flex flex-wrap items-center gap-2">
            {u.email} <StatusPill status={u.status} />
            {!u.emailVerified && <Pill tone="amber">email not verified</Pill>}
            {u.twoFactorEnabled && <Pill tone="green">MFA on</Pill>}
            {u.lockedUntil && u.lockedUntil > new Date() && <Pill tone="red">locked until {when(u.lockedUntil, true)}</Pill>}
          </span>
        }
      />

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-6">
          <Panel title="Courses and access">
            {u.enrolments.length === 0 ? (
              <p className="text-[13px] text-muted-foreground">Not enrolled anywhere.</p>
            ) : (
              <Table head={["Course", "State", "Source", "Started", "Access until", ""]} minWidth="40rem">
                {u.enrolments.map((e) => (
                  <tr key={e.id}>
                    <Td>{e.program.name}</Td>
                    <Td>
                      <StatusPill status={e.state} />
                    </Td>
                    <Td className="text-[12.5px]">{e.source.toLowerCase()}</Td>
                    <Td>{when(e.startedAt)}</Td>
                    <Td>{e.expiresAt ? when(e.expiresAt) : "no expiry"}</Td>
                    <Td>
                      {can(actor, "subscriber.enrol") && (
                        <details>
                          <summary className="cursor-pointer text-[12.5px] underline">Manage</summary>
                          <div className="mt-2 flex w-72 flex-col gap-3">
                            <ActionForm action={extendAccessAction} className="flex flex-col gap-1.5">
                              <input type="hidden" name="enrolmentId" value={e.id} />
                              <input type="hidden" name="userId" value={u.id} />
                              <input name="until" type="date" defaultValue={dateInput(e.expiresAt)} aria-label="Access until" className={FIELD} />
                              <input name="reason" required placeholder="Reason (recorded)" aria-label="Reason" className={FIELD} />
                              <button className={`${BTN_OUTLINE} w-fit`}>Set access date</button>
                            </ActionForm>
                            <ActionForm action={enrolmentStateAction} className="flex flex-col gap-1.5">
                              <input type="hidden" name="enrolmentId" value={e.id} />
                              <input type="hidden" name="userId" value={u.id} />
                              <select name="state" defaultValue={e.state} aria-label="Enrolment state" className={FIELD}>
                                {["ACTIVE", "SUSPENDED", "CANCELLED", "EXPIRED"].map((s) => (
                                  <option key={s} value={s}>
                                    {s.toLowerCase()}
                                  </option>
                                ))}
                              </select>
                              <input name="reason" required placeholder="Reason (recorded)" aria-label="Reason" className={FIELD} />
                              <button className={`${BTN_OUTLINE} w-fit`}>Change state</button>
                            </ActionForm>
                            {can(actor, "subscriber.progress_reset") && (
                              <ActionForm action={requestProgressResetAction} className="flex flex-col gap-1.5" success="Requested; a privacy approver must confirm.">
                                <input type="hidden" name="userId" value={u.id} />
                                <input type="hidden" name="programId" value={e.programId} />
                                <input name="reason" required placeholder="Why reset progress" aria-label="Reason" className={FIELD} />
                                <button className={`${BTN_OUTLINE} w-fit`}>Request progress reset</button>
                              </ActionForm>
                            )}
                          </div>
                        </details>
                      )}
                    </Td>
                  </tr>
                ))}
              </Table>
            )}
            {pendingResets.map((r) => (
              <p key={r.id} className="mt-2 text-[12.5px] text-warning">
                Pending approval: {r.summary}
              </p>
            ))}
            {can(actor, "subscriber.enrol") && (
              <ActionForm action={grantEnrolmentAction} className="mt-4 flex flex-wrap items-end gap-2 border-t border-border pt-4" success="Access granted.">
                <input type="hidden" name="userId" value={u.id} />
                <select name="programId" required aria-label="Course" className={`${FIELD} w-auto`}>
                  {courses
                    .filter((c) => !enrolledIds.has(c.id))
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
                <input name="expiresAt" type="date" aria-label="Access until (optional)" className={`${FIELD} w-auto`} />
                <Checkbox name="complimentary" label="Complimentary" />
                <button className={BTN}>Grant access</button>
              </ActionForm>
            )}
          </Panel>

          <Panel title="Assessments">
            <ul className="text-[13px]">
              {u.quizAttempts.length === 0 && <li className="text-muted-foreground">No attempts.</li>}
              {u.quizAttempts.map((a) => (
                <li key={a.id} className="flex flex-wrap gap-2 py-0.5">
                  {a.quiz.title} · attempt {a.attemptNo} · {a.status.toLowerCase().replace("_", " ")}
                  {a.score !== null && ` · ${a.score}%`}
                  {a.passed === true && <Pill tone="green">passed</Pill>}
                  <span className="text-muted-foreground">{when(a.submittedAt, true)}</span>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Certificates and badges">
            <ul className="text-[13px]">
              {u.certificates.length + u.badges.length === 0 && <li className="text-muted-foreground">None yet.</li>}
              {u.certificates.map((c) => (
                <li key={c.id} className="py-0.5">
                  <Link href={`/certificates/${c.serial}`} className="text-data underline">
                    {c.serial}
                  </Link>{" "}
                  {c.programName} · {when(c.issuedAt)} {c.revokedAt && <Pill tone="red">revoked</Pill>}
                </li>
              ))}
              {u.badges.map((b) => (
                <li key={b.id} className="py-0.5">
                  {b.name} · {b.serial} · {when(b.issuedAt)}
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Orders and subscriptions">
            <ul className="text-[13px]">
              {u.subscriptions.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center gap-2 py-0.5">
                  {s.product.name} <StatusPill status={s.status} /> renews/ends {when(s.currentPeriodEnd)}
                </li>
              ))}
              {u.orders.map((o) => (
                <li key={o.id} className="flex flex-wrap items-center gap-2 py-0.5">
                  <span className="text-data text-[12px]">{o.number ?? o.id.slice(0, 8)}</span> {o.product?.name} · {inr(o.amount)} <StatusPill status={o.state} />
                  {o.refunds.length > 0 && <Pill tone="amber">{o.refunds.length} refund</Pill>}
                  <span className="text-muted-foreground">{when(o.createdAt)}</span>
                </li>
              ))}
              {u.orders.length + u.subscriptions.length === 0 && <li className="text-muted-foreground">No purchases.</li>}
            </ul>
            {can(actor, "finance.view") && (
              <Link href={`/admin/finance?q=${encodeURIComponent(u.email)}`} className="mt-2 inline-block text-micro underline">
                Open in finance
              </Link>
            )}
          </Panel>

          <Panel title="Support cases">
            <ul className="text-[13px]">
              {u.tickets.length === 0 && <li className="text-muted-foreground">No cases.</li>}
              {u.tickets.map((t) => (
                <li key={t.id} className="flex flex-wrap items-center gap-2 py-0.5">
                  <Link href={`/admin/support/${t.id}`} className="text-data text-[12px] underline">
                    {t.reference}
                  </Link>
                  {t.subject} <StatusPill status={t.status} />
                </li>
              ))}
            </ul>
          </Panel>
        </div>

        <div className="flex flex-col gap-6">
          <Panel title="Profile">
            <ActionForm action={editProfileAction} className="flex flex-col gap-2.5" success="Saved.">
              <input type="hidden" name="userId" value={u.id} />
              <fieldset disabled={!can(actor, "subscriber.edit")} className="contents">
                <Field label="Name" htmlFor="pn">
                  <input id="pn" name="name" defaultValue={u.name} className={FIELD} />
                </Field>
                <Field label="Country" htmlFor="pc">
                  <input id="pc" name="country" defaultValue={u.country ?? ""} className={FIELD} />
                </Field>
                <Field label="Time zone" htmlFor="pt">
                  <input id="pt" name="timezone" defaultValue={u.timezone ?? ""} className={FIELD} />
                </Field>
                <Field label="Current role" htmlFor="pr">
                  <input id="pr" name="currentRole" defaultValue={u.currentRole ?? ""} className={FIELD} />
                </Field>
                <Field label="Phone" htmlFor="pp" hint={u.sensitive ? undefined : "Masked: you do not have access to contact details."}>
                  <input id="pp" name="phone" defaultValue={u.phone ?? ""} disabled={!u.sensitive} className={FIELD} />
                </Field>
              </fieldset>
              {can(actor, "subscriber.edit") && <button className={`${BTN} w-fit`}>Save profile</button>}
            </ActionForm>
            <p className="mt-3 text-[12px] text-muted-foreground">
              Last sign-in {when(u.lastLoginAt, true)}
              {u.lastLoginIp && ` from ${u.lastLoginIp}`} · marketing {u.marketingOptIn ? "opted in" : "not opted in"} · terms accepted {when(u.termsAcceptedAt)}
            </p>
            {u.orgMembers.length > 0 && <p className="mt-1 text-[12px]">Corporate: {u.orgMembers.map((m) => m.org.name).join(", ")}</p>}
          </Panel>

          {can(actor, "subscriber.suspend") && (
            <Panel title="Account status">
              <ActionForm action={setStatusAction} className="flex flex-col gap-2" confirm="Change this account's status? Suspending signs the person out everywhere.">
                <input type="hidden" name="userId" value={u.id} />
                <select name="status" defaultValue={u.status} aria-label="Status" className={FIELD}>
                  {SETTABLE.map((s) => (
                    <option key={s} value={s}>
                      {s.toLowerCase()}
                    </option>
                  ))}
                </select>
                <input name="reason" required placeholder="Reason (recorded in the audit log)" aria-label="Reason" className={FIELD} />
                <button className={`${BTN_OUTLINE} w-fit`}>Update status</button>
              </ActionForm>
              <ActionForm action={resetAuthAction} className="mt-4 flex flex-col gap-2 border-t border-border pt-4" confirm="Sign this person out everywhere and email a password-reset link?" success="Signed out everywhere; reset link sent.">
                <input type="hidden" name="userId" value={u.id} />
                <input name="reason" required placeholder="Reason, e.g. verified account-recovery request" aria-label="Reason" className={FIELD} />
                <button className={`${BTN_OUTLINE} w-fit`}>Reset authentication</button>
              </ActionForm>
            </Panel>
          )}
          {!u.emailVerified && can(actor, "subscriber.edit") && (
            <ActionButton action={resendVerificationAction} fields={{ userId: u.id }} success="Verification email sent.">
              Resend verification email
            </ActionButton>
          )}

          {can(actor, "subscriber.notes") && (
            <Panel title="Internal notes">
              <p className="text-[12px] text-muted-foreground">Visible to staff only and included in the audit trail. Never record patient information or card numbers; detected identifiers are masked.</p>
              <ul className="mt-2 flex flex-col gap-2 text-[13px]">
                {u.notesAbout.map((n) => (
                  <li key={n.id} className="border-l-2 border-border pl-2.5">
                    <span className="text-micro text-muted-foreground">
                      {n.author.name} · {when(n.createdAt, true)}
                    </span>
                    <p className="whitespace-pre-wrap">{n.body}</p>
                  </li>
                ))}
              </ul>
              <ActionForm action={addNoteAction} className="mt-3 flex flex-col gap-2" resetOnSuccess>
                <input type="hidden" name="userId" value={u.id} />
                <textarea name="body" required rows={3} aria-label="Note" className={TEXTAREA} />
                <button className={`${BTN_OUTLINE} w-fit`}>Add note</button>
              </ActionForm>
            </Panel>
          )}

          <Panel title="Consent and privacy">
            <ul className="text-[12.5px]">
              {u.consents.map((c) => (
                <li key={c.id}>
                  {c.kind} {c.granted ? "granted" : "withdrawn"} · v{c.version} · {when(c.createdAt)}
                </li>
              ))}
              {u.privacyRequests.map((r) => (
                <li key={r.id} className="flex items-center gap-2">
                  {r.kind.toLowerCase()} request <StatusPill status={r.status} /> {when(r.createdAt)}
                </li>
              ))}
              {u.consents.length + u.privacyRequests.length === 0 && <li className="text-muted-foreground">No consent records or privacy requests.</li>}
            </ul>
          </Panel>

          <Panel title="Recent notifications">
            <ul className="text-[12.5px]">
              {u.notifications.map((n) => (
                <li key={n.id}>
                  {n.title} · {when(n.createdAt, true)} {n.readAt ? "" : "· unread"}
                </li>
              ))}
              {u.notifications.length === 0 && <li className="text-muted-foreground">None.</li>}
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  );
}
