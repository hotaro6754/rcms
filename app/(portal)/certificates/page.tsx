import Link from "next/link";
import { requireUser } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { eligibility } from "@/lib/certificates";
import { PageHead, Ruled } from "@/components/platform/PlatformShell";
import { ClaimButton } from "@/components/certificates/ClaimButton";

export const metadata = { title: "Certificates" };

const DATE = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" });

/**
 * A student's certificates: the ones earned, each with its serial and public verification
 * link, and for every other enrolled program exactly what is left before it can be claimed.
 */
export default async function CertificatesPage() {
  const user = await requireUser();

  const [certs, enrolments] = await Promise.all([
    prisma.certificate.findMany({
      where: { userId: user.id },
      orderBy: { issuedAt: "desc" },
      include: { program: { select: { level: true } } },
    }),
    prisma.enrolment.findMany({
      where: { userId: user.id, state: { in: ["ACTIVE", "COMPLETED"] } },
      include: { program: { select: { id: true, name: true, level: true, slug: true } } },
      orderBy: { createdAt: "asc" },
    }),
  ]);
  const held = new Set(certs.filter((c) => !c.revokedAt).map((c) => c.programId));
  const pending = [];
  for (const e of enrolments) {
    if (!held.has(e.programId)) pending.push({ program: e.program, status: await eligibility(user.id, e.programId) });
  }

  return (
    <div className="mx-auto max-w-[1320px] px-6 py-12 lg:py-16">
      <PageHead
        kicker="Certificates"
        title="Proof of the work"
        lede="A certificate is issued when every lesson of a program is complete and every assessment is passed. Each carries a serial anyone can check."
      />

      <div className="mt-12 grid gap-14 lg:grid-cols-2">
        <Ruled label="Earned">
          {certs.length === 0 ? (
            <p className="py-5 text-[14px] text-muted-foreground">None yet. Your first appears here the day you finish a program.</p>
          ) : (
            <ul>
              {certs.map((c) => (
                <li key={c.id} className="border-b border-border py-5">
                  <p className="text-data text-[10.5px] tracking-[0.12em] text-subtle">
                    LEVEL {String(c.program.level).padStart(2, "0")} · {DATE.format(c.issuedAt).toUpperCase()}
                    {c.revokedAt && <span className="ml-2 text-danger">REVOKED</span>}
                  </p>
                  <p className="font-serif-display mt-2 text-[1.5rem] leading-snug">{c.programName}</p>
                  <div className="mt-3 flex flex-wrap items-baseline gap-x-6 gap-y-2">
                    <span className="text-data text-[12px] tracking-[0.05em]">{c.serial}</span>
                    <Link href={`/certificates/${c.serial}`} className="text-[14px] underline decoration-input underline-offset-[6px] hover:decoration-foreground">
                      Open, print or share
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Ruled>

        <Ruled label="In progress">
          {pending.length === 0 ? (
            <p className="py-5 text-[14px] text-muted-foreground">
              {enrolments.length ? "Every program you are enrolled on is certified." : "Enrol on a program to start working towards its certificate."}
            </p>
          ) : (
            <ul>
              {pending.map(({ program, status: s }) => (
                <li key={program.id} className="border-b border-border py-5">
                  <p className="text-data text-[10.5px] tracking-[0.12em] text-subtle">LEVEL {String(program.level).padStart(2, "0")}</p>
                  <p className="font-serif-display mt-2 text-[1.5rem] leading-snug">{program.name}</p>
                  <dl className="text-data mt-3 grid w-fit grid-cols-[auto_auto] gap-x-6 gap-y-1 text-[12px]">
                    <dt className="text-subtle">LESSONS</dt>
                    <dd>
                      {s.lessonsDone} / {s.lessonsTotal}
                    </dd>
                    <dt className="text-subtle">QUIZZES PASSED</dt>
                    <dd>
                      {s.quizzesPassed} / {s.quizzesTotal}
                    </dd>
                  </dl>
                  <div className="mt-4">
                    {s.eligible ? (
                      <ClaimButton
                        programId={program.id}
                        className="inline-flex min-h-11 items-center rounded-[3px] bg-primary px-5 text-[14px] font-medium text-primary-foreground hover:bg-primary-hover"
                      />
                    ) : (
                      <Link href={`/academy/${program.slug}`} className="text-[14px] underline decoration-input underline-offset-[6px] hover:decoration-foreground">
                        {s.lessonsTotal === 0 ? "Lessons are still being published" : "Continue the program"}
                      </Link>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Ruled>
      </div>
    </div>
  );
}
