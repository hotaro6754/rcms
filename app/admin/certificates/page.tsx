import Link from "next/link";
import { requireAnyPermission } from "@/lib/actor";
import { prisma } from "@/lib/db";
import { eligibility } from "@/lib/certificates";
import { PageHead, Ruled } from "@/components/platform/PlatformShell";
import { IssueForm, IssueNow, RevokeControl } from "@/components/admin/CertificateControls";
import { ActionButton } from "@/components/admin/ActionForm";
import { reissueCertificateAction } from "@/lib/actions/learning";

export const metadata = { title: "Certificates · Admin" };

const DATE = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" });

/**
 * The certificate register. Who has earned one and not yet claimed it, a manual issue for
 * corporate cohorts and records from before the platform, and every certificate issued,
 * with revoke.
 */
export default async function AdminCertificatesPage() {
  await requireAnyPermission(["certificate.issue", "certificate.revoke"]);

  const [certs, enrolments, people, programs] = await Promise.all([
    prisma.certificate.findMany({ orderBy: { issuedAt: "desc" }, include: { user: { select: { email: true } } } }),
    prisma.enrolment.findMany({
      where: { state: { in: ["ACTIVE", "COMPLETED"] } },
      include: { user: { select: { id: true, name: true, email: true } }, program: { select: { id: true, name: true } } },
    }),
    prisma.user.findMany({ where: { emailVerified: true }, orderBy: { name: "asc" }, select: { id: true, name: true, email: true } }),
    prisma.program.findMany({ orderBy: { level: "asc" }, select: { id: true, name: true, level: true } }),
  ]);

  const held = new Set(certs.filter((c) => !c.revokedAt).map((c) => `${c.userId}:${c.programId}`));
  const ready = [];
  for (const e of enrolments) {
    if (held.has(`${e.userId}:${e.programId}`)) continue;
    if ((await eligibility(e.userId, e.programId)).eligible) ready.push(e);
  }

  return (
    <div className="mx-auto max-w-[1320px] px-6 py-12 lg:py-16">
      <PageHead
        kicker="Admin · Certificates"
        title="The register"
        lede="Students claim their own certificates when they finish. Issue here for corporate cohorts, or when a completion needs recognising by hand."
      />

      <div className="mt-12 grid gap-14 lg:grid-cols-2">
        <Ruled label={`Ready to issue · ${ready.length}`}>
          {ready.length === 0 ? (
            <p className="py-5 text-[14px] text-muted-foreground">Nobody is waiting. Everyone who has finished a program holds its certificate.</p>
          ) : (
            <ul>
              {ready.map((e) => (
                <li key={e.id} className="flex items-baseline justify-between gap-4 border-b border-border py-3.5">
                  <span>
                    <span className="block text-[14px]">{e.user.name}</span>
                    <span className="block text-[12.5px] text-muted-foreground">{e.program.name}</span>
                  </span>
                  <IssueNow userId={e.userId} programId={e.programId} />
                </li>
              ))}
            </ul>
          )}
        </Ruled>
        <Ruled label="Issue by hand">
          <IssueForm
            people={people.map((p) => ({ id: p.id, label: `${p.name} · ${p.email}` }))}
            programs={programs.map((p) => ({ id: p.id, label: `L${p.level} · ${p.name}` }))}
          />
          <p className="text-[12.5px] leading-relaxed text-subtle">
            A hand-issued certificate records its basis as manual unless the person has in fact met every requirement.
          </p>
        </Ruled>
      </div>

      <Ruled label={`Issued · ${certs.length}`} className="mt-16">
        {certs.length === 0 ? (
          <p className="py-5 text-[14px] text-muted-foreground">No certificates issued yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-[13.5px]">
              <thead>
                <tr className="text-data border-b border-border text-[10.5px] tracking-[0.12em] text-subtle">
                  <th className="py-3 pr-4 font-normal">SERIAL</th>
                  <th className="py-3 pr-4 font-normal">HOLDER</th>
                  <th className="py-3 pr-4 font-normal">PROGRAM</th>
                  <th className="py-3 pr-4 font-normal">ISSUED</th>
                  <th className="py-3 pr-4 font-normal">BASIS</th>
                  <th className="py-3 font-normal">STATUS</th>
                </tr>
              </thead>
              <tbody>
                {certs.map((c) => (
                  <tr key={c.id} className="border-b border-border align-top">
                    <td className="py-3.5 pr-4">
                      <Link href={`/certificates/${c.serial}`} className="text-data text-[12px] underline-offset-4 hover:underline">
                        {c.serial}
                      </Link>
                    </td>
                    <td className="py-3.5 pr-4">
                      {c.holderName}
                      <span className="block text-[12px] text-muted-foreground">{c.user.email}</span>
                    </td>
                    <td className="py-3.5 pr-4">
                      {c.programName}
                      {c.courseVersion && <span className="block text-[12px] text-muted-foreground">version {c.courseVersion}</span>}
                    </td>
                    <td className="text-data py-3.5 pr-4 text-[12px]">{DATE.format(c.issuedAt)}</td>
                    <td className="text-data py-3.5 pr-4 text-[11px] uppercase tracking-[0.08em] text-subtle">{c.basis}</td>
                    <td className="py-3.5">
                      {c.revokedAt ? (
                        <span className="flex flex-col items-start gap-1.5">
                          <span className="text-data text-[11px] tracking-[0.1em] text-danger" title={c.revokeReason ?? undefined}>
                            REVOKED
                          </span>
                          {c.revokeReason && <span className="text-[12px] text-muted-foreground">{c.revokeReason}</span>}
                          {!held.has(`${c.userId}:${c.programId}`) && (
                            <ActionButton action={reissueCertificateAction} fields={{ certificateId: c.id }} variant="ghost" confirm="Issue a corrected certificate with a new serial?">
                              Re-issue
                            </ActionButton>
                          )}
                        </span>
                      ) : (
                        <span className="flex items-baseline gap-5">
                          <span className="text-data text-[11px] tracking-[0.1em] text-brand">VALID</span>
                          <RevokeControl certificateId={c.id} />
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Ruled>
    </div>
  );
}
