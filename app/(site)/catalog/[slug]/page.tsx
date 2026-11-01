import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getActor } from "@/lib/actor";
import { courseAccess, getPublishedCourse } from "@/lib/services/learning/catalog";
import { flatLessons, snapshotMinutes } from "@/lib/cms/snapshot";
import { ActionForm } from "@/components/admin/ActionForm";
import { enrolFreeAction } from "@/lib/actions/learning";
import { paymentsConfigured } from "@/lib/payments/razorpay";
import { when } from "@/components/admin/kit";
import { Breadcrumbs } from "@/components/site/PageHeader";
import { getPageContent } from "@/lib/site/content";
import { coursePage } from "@/lib/site/pages/course";
import { jsonLd, organisationLd, pageMeta, siteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const c = await getPublishedCourse((await params).slug);
  return c ? pageMeta({ title: c.snapshot.course.name, description: c.snapshot.course.description, path: `/catalog/${c.slug}` }) : { title: "Course" };
}

const BTN = "inline-flex min-h-12 items-center rounded-md bg-primary px-6 text-[15px] font-medium text-primary-foreground hover:bg-primary-hover";

/**
 * A course's public page: outcomes, prerequisites, effort, module and lesson list, the
 * assessment method, free previews, price, and the right next step for this visitor.
 */
export default async function CourseDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const course = await getPublishedCourse(slug);
  if (!course) notFound();
  const s = course.snapshot;
  const [actor, t] = await Promise.all([getActor(), getPageContent(coursePage)]);
  const [access, level, product] = await Promise.all([
    actor ? courseAccess(actor, course) : null,
    course.levelId ? prisma.learningLevel.findUnique({ where: { id: course.levelId }, select: { displayTitle: true, slug: true, sequence: true } }) : null,
    prisma.product.findFirst({ where: { programId: course.id, kind: "PROGRAM", active: true }, select: { sku: true, amount: true } }),
  ]);
  const lessons = flatLessons(s);
  const previews = lessons.filter((l) => l.freePreview);
  const minutes = s.course.durationMinutes ?? snapshotMinutes(s);
  const assessed = lessons.filter((l) => l.assessment);

  let cta: React.ReactNode;
  if (!actor) {
    cta = (
      <Link href={`/sign-up?next=/catalog/${slug}`} className={BTN}>
        {t.buttons.signUp}
      </Link>
    );
  } else if (access?.full && access.reason !== "staff_preview") {
    cta = (
      <Link href={`/academy/${slug}`} className={BTN}>
        {t.buttons.goTo}
      </Link>
    );
  } else if (s.course.isFree || access?.coveredBySubscription) {
    cta = (
      <ActionForm action={enrolFreeAction} redirectTo={`/academy/${slug}`}>
        <input type="hidden" name="courseId" value={course.id} />
        <button className={BTN}>{s.course.isFree ? t.buttons.enrolFree : t.buttons.included}</button>
      </ActionForm>
    );
  } else if (product && paymentsConfigured()) {
    cta = (
      <Link href={`/checkout/${product.sku}`} className={BTN}>
        {t.buttons.enrolPaid} · ₹{(product.amount / 100).toLocaleString("en-IN")}
      </Link>
    );
  } else {
    cta = (
      <Link href={`/contact?interest=${encodeURIComponent(s.course.name)}`} className={BTN}>
        {t.buttons.ask}
      </Link>
    );
  }

  // Structured data so search engines can show the course, its provider and its price.
  const ld = jsonLd({
    "@type": "Course",
    name: s.course.name,
    description: s.course.description ?? undefined,
    url: `${siteUrl().origin}/catalog/${slug}`,
    provider: organisationLd(),
    ...(s.course.isFree ? { isAccessibleForFree: true } : product ? { offers: { "@type": "Offer", price: (product.amount / 100).toFixed(2), priceCurrency: "INR", category: "Paid" } } : {}),
  });

  return (
    <div className="mx-auto max-w-[1280px] px-4 pb-24 pt-4 sm:px-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld }} />
      <Breadcrumbs items={[{ label: t.nav.back.label.replace(/^←\s*/, "") || "Catalogue", href: t.nav.back.href }, { label: s.course.name }]} />
      <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div>
          <p className="eyebrow">{level ? `${t.intro.levelPrefix} ${level.sequence} · ${level.displayTitle.toUpperCase()}` : t.intro.noLevel}</p>
          <h1 className="mt-3 text-[clamp(2rem,4vw,3.25rem)] leading-[1.08]">{s.course.name}</h1>
          {s.course.description && <p className="mt-5 max-w-[65ch] text-[17px] leading-relaxed text-muted-foreground">{s.course.description}</p>}
          {s.course.who && <p className="mt-4 text-[15px]">{t.intro.forLabel} {s.course.who}</p>}

          {s.course.outcomes.length > 0 && (
            <section className="mt-10">
              <h2 className="text-[1.4rem]">{t.intro.outcomesTitle}</h2>
              <ul className="mt-4 grid gap-2.5 text-[15px] sm:grid-cols-2">
                {s.course.outcomes.map((o) => (
                  <li key={o} className="flex gap-2.5 rounded-lg border border-border bg-card px-4 py-3"><span aria-hidden className="mt-0.5 text-brand">✓</span>{o}</li>
                ))}
              </ul>
            </section>
          )}

          <section className="mt-10">
            <h2 className="text-[1.4rem]">{t.intro.curriculumTitle}</h2>
            <ol className="mt-4 flex flex-col gap-3">
              {s.modules.map((m, i) => (
                <li key={m.id} className="site-card px-5 py-4">
                  <p className="text-[15px] font-medium">
                    <span className="text-data mr-2 text-[12px] text-subtle">{String(i + 1).padStart(2, "0")}</span>
                    {m.title}
                  </p>
                  <ul className="mt-2 flex flex-col gap-1 text-[13.5px] text-muted-foreground">
                    {m.lessons.map((l) => (
                      <li key={l.id} className="flex items-baseline justify-between gap-3">
                        {l.freePreview && actor ? (
                          <Link href={`/academy/${slug}/${l.id}`} className="text-brand underline underline-offset-4">
                            {l.title} — {t.intro.preview}
                          </Link>
                        ) : (
                          <span>
                            {l.title}
                            {l.freePreview && ` — ${t.intro.previewSignIn}`}
                          </span>
                        )}
                        <span className="text-data shrink-0 text-[12px]">{l.minutes} {t.intro.minutes}</span>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside className="flex h-fit flex-col gap-5 site-card p-6 lg:sticky lg:top-28">
          <p className="font-serif-display text-[2rem] leading-none">{s.course.isFree ? t.facts.free : product ? `₹${(product.amount / 100).toLocaleString("en-IN")}` : "—"}</p>
          {s.course.includedInSubscription && !s.course.isFree && <p className="-mt-3 text-[13px] text-muted-foreground">{t.facts.included}</p>}
          {cta}
          <dl className="grid grid-cols-2 gap-3 text-[13px]">
            <div>
              <dt className="text-subtle">{t.facts.effort}</dt>
              <dd>{Math.round(minutes / 60) || "<1"} {t.facts.hours}{ s.course.weeks ? ` · ${s.course.weeks}` : ""}</dd>
            </div>
            <div>
              <dt className="text-subtle">{t.facts.modules}</dt>
              <dd>
                {s.modules.length} · {lessons.length} {t.facts.lessons}
              </dd>
            </div>
            <div>
              <dt className="text-subtle">{t.facts.assessment}</dt>
              <dd>{assessed.length ? `${assessed.length} ${assessed.length === 1 ? t.facts.assessedOne : t.facts.assessedMany}` : t.facts.noAssessment}</dd>
            </div>
            <div>
              <dt className="text-subtle">{t.facts.previews}</dt>
              <dd>{previews.length || t.facts.none}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-subtle">{t.facts.prerequisites}</dt>
              <dd>{s.course.prerequisites.length ? s.course.prerequisites.join("; ") : t.facts.none}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-subtle">{t.facts.completion}</dt>
              <dd>{t.facts.completionText}</dd>
            </div>
          </dl>
          <p className="border-t border-border pt-4 text-[12px] leading-relaxed text-muted-foreground">
            {t.review.effective} {when(s.course.effectiveDate)}, {t.review.next} {when(s.course.reviewDate)}. {t.review.note}
          </p>
        </aside>
      </div>
    </div>
  );
}
