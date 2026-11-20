import Link from "next/link";
import { ArrowRight, Award, Check, ExternalLink, Play } from "lucide-react";
import { requireUser } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { eligibility } from "@/lib/certificates";
import { comingSoon } from "@/lib/launch";
import { siteUrl } from "@/lib/seo";
import { BRAND } from "@/lib/brand";
import { ClaimButton } from "@/components/certificates/ClaimButton";
import { CopyLink } from "@/components/certificates/CopyLink";
import s from "./certificates.module.css";

export const metadata = { title: "Certificates" };

const DATE = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" });

/** LinkedIn's "Add licence or certification" form, pre-filled. Opens on LinkedIn; nothing is sent from here. */
function linkedInUrl(c: { programName: string; issuedAt: Date; serial: string }, url: string) {
  const p = new URLSearchParams({
    startTask: "CERTIFICATION_NAME",
    name: c.programName,
    organizationName: BRAND.name,
    issueYear: String(c.issuedAt.getFullYear()),
    issueMonth: String(c.issuedAt.getMonth() + 1),
    certUrl: url,
    certId: c.serial,
  });
  return `https://www.linkedin.com/profile/add?${p.toString()}`;
}

/**
 * A learner's certificates: earned ones drawn as certificates with view, copy-link and
 * LinkedIn actions; every other enrolled course with exactly what is left before it can be
 * claimed. Each certificate carries a serial anyone can check.
 */
export default async function CertificatesPage() {
  const user = await requireUser();
  const closed = comingSoon();
  const base = siteUrl().origin;

  const [certs, enrolments] = await Promise.all([
    prisma.certificate.findMany({ where: { userId: user.id }, orderBy: { issuedAt: "desc" }, include: { program: { select: { level: true, slug: true } } } }),
    prisma.enrolment.findMany({
      where: { userId: user.id, state: { in: ["ACTIVE", "COMPLETED"] } },
      include: { program: { select: { id: true, name: true, level: true, slug: true } } },
      orderBy: { createdAt: "asc" },
    }),
  ]);
  const held = new Set(certs.filter((c) => !c.revokedAt).map((c) => c.programId));
  const pending = [];
  for (const e of enrolments) if (!held.has(e.programId)) pending.push({ program: e.program, status: await eligibility(user.id, e.programId) });
  const earned = certs.filter((c) => !c.revokedAt).length;
  const C = 2 * Math.PI * 30;

  return (
    <div className={s.page}>
      <header className={s.hero}>
        <div className={s.heroCopy}>
          <p className="x-kicker">Certificates</p>
          <h1 className={`x-display ${s.title}`}>Proof of the work</h1>
          <p className={s.lede}>
            A certificate is issued when every lesson of a course is complete and every assessment is passed. Each one carries a serial that an employer can check.
          </p>
        </div>
        <dl className={s.stats}>
          <div className="x-slab x-green">
            <dt>Earned</dt>
            <dd className="x-fig">{earned}</dd>
          </div>
          <div className="x-slab x-sand">
            <dt>In progress</dt>
            <dd className="x-fig">{pending.length}</dd>
          </div>
        </dl>
      </header>

      {/* ---------- earned ---------- */}
      <section className={s.block} aria-labelledby="earned-title">
        <h2 id="earned-title" className={`x-display ${s.h2}`}>
          Earned
        </h2>
        {certs.length === 0 ? (
          <div className={s.emptyCert}>
            <div className={s.ghostSheet} aria-hidden>
              <Award />
              <span />
              <span />
              <span />
            </div>
            <div>
              <p className={s.emptyTitle}>Your first certificate will appear here</p>
              <p className={s.emptyText}>Finish every lesson of a course and pass its assessments, then claim it below.</p>
            </div>
          </div>
        ) : (
          <ul className={s.certs}>
            {certs.map((c, i) => {
              const url = `${base}/certificates/${c.serial}`;
              return (
                <li key={c.id} className={s.certItem} style={{ animationDelay: `${i * 70}ms` }} data-revoked={c.revokedAt ? "" : undefined}>
                  <Link href={`/certificates/${c.serial}`} className={s.sheet} aria-label={`Open certificate for ${c.programName}`}>
                    <span className={s.sheetTop}>
                      <span className={s.brand}>RCMEXCEL ACADEMY</span>
                      <span className={s.level}>Level {String(c.program.level).padStart(2, "0")}</span>
                    </span>
                    <span className={s.sheetKicker}>Certificate of completion</span>
                    <span className={`x-display ${s.holder}`}>{c.holderName}</span>
                    <span className={s.course}>{c.programName}</span>
                    <span className={s.sheetFoot}>
                      <span>
                        {DATE.format(c.issuedAt)}
                        <br />
                        <code>{c.serial}</code>
                      </span>
                      <span className={s.seal} aria-hidden>
                        <Award />
                      </span>
                    </span>
                    {c.revokedAt && <span className={s.revoked}>Revoked</span>}
                  </Link>
                  {!c.revokedAt && (
                    <div className={s.actions}>
                      <Link href={`/certificates/${c.serial}`} className={s.primary}>
                        View and print
                      </Link>
                      <CopyLink url={url} className={s.secondary} />
                      <a href={linkedInUrl(c, url)} target="_blank" rel="noopener noreferrer" className={s.secondary}>
                        <ExternalLink aria-hidden /> Add to LinkedIn
                      </a>
                    </div>
                  )}
                  {closed && !c.revokedAt && <p className={s.note}>The public verification page opens when RCMExcel launches; until then the link shows the coming-soon page.</p>}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* ---------- in progress ---------- */}
      <section className={s.block} aria-labelledby="progress-title">
        <h2 id="progress-title" className={`x-display ${s.h2}`}>
          In progress
        </h2>
        {pending.length === 0 ? (
          <div className={s.emptyRow}>
            <p>{enrolments.length ? "Every course you are enrolled on is certified." : "Enrol on a course to start working towards its certificate."}</p>
            {!enrolments.length && (
              <Link href="/catalog" className={s.primary}>
                Find your level
              </Link>
            )}
          </div>
        ) : (
          <ul className={s.pending}>
            {pending.map(({ program, status: st }, i) => {
              const total = st.lessonsTotal + st.quizzesTotal;
              const done = st.lessonsDone + st.quizzesPassed;
              const pct = total ? Math.round((done / total) * 100) : 0;
              const left = st.lessonsTotal - st.lessonsDone;
              const quizzesLeft = st.quizzesTotal - st.quizzesPassed;
              return (
                <li key={program.id} className={s.pendingItem} style={{ animationDelay: `${i * 70}ms` }}>
                  <div className={s.pendingTop}>
                    <svg viewBox="0 0 76 76" className={s.ring} role="img" aria-label={`${pct}% of the way to the certificate`}>
                      <circle cx="38" cy="38" r="30" className={s.ringTrack} />
                      <circle cx="38" cy="38" r="30" className={s.ringFill} data-ready={st.eligible || undefined} strokeDasharray={`${(pct / 100) * C} ${C}`} transform="rotate(-90 38 38)" />
                      <text x="38" y="43" textAnchor="middle" className={s.ringN}>
                        {pct}%
                      </text>
                    </svg>
                    <div>
                      <p className={s.pendingLevel}>Level {String(program.level).padStart(2, "0")}</p>
                      <p className={s.pendingName}>{program.name}</p>
                      <p className={s.pendingLeft}>
                        {st.eligible
                          ? "Everything is done. Your certificate is ready to claim."
                          : st.lessonsTotal === 0
                            ? "Lessons are still being published."
                            : `${left > 0 ? `${left} lesson${left > 1 ? "s" : ""}` : ""}${left > 0 && quizzesLeft > 0 ? " and " : ""}${quizzesLeft > 0 ? `${quizzesLeft} assessment${quizzesLeft > 1 ? "s" : ""}` : ""} to go.`}
                      </p>
                    </div>
                  </div>
                  <ul className={s.reqs}>
                    <li data-ok={(st.lessonsTotal > 0 && st.lessonsDone >= st.lessonsTotal) || undefined}>
                      <Check aria-hidden /> All lessons complete
                      <span>
                        {st.lessonsDone}/{st.lessonsTotal}
                      </span>
                    </li>
                    {st.quizzesTotal > 0 && (
                      <li data-ok={st.quizzesPassed >= st.quizzesTotal || undefined}>
                        <Check aria-hidden /> Assessments passed
                        <span>
                          {st.quizzesPassed}/{st.quizzesTotal}
                        </span>
                      </li>
                    )}
                  </ul>
                  <div className={s.pendingActions}>
                    {st.eligible ? (
                      <ClaimButton programId={program.id} className={s.claim} />
                    ) : (
                      <Link href={`/academy/${program.slug}`} className={s.primary}>
                        <Play aria-hidden /> Continue the course <ArrowRight aria-hidden />
                      </Link>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
