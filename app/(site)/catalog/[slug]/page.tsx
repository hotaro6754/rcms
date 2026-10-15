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

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const c = await getPublishedCourse((await params).slug);
  return { title: c ? c.snapshot.course.name : "Course", description: c?.snapshot.course.description ?? undefined };
}

const BTN = "inline-flex min-h-12 items-center rounded-[3px] bg-primary px-6 text-[15px] font-medium text-primary-foreground hover:bg-primary-hover";

/**
 * A course's public page: outcomes, prerequisites, effort, module and lesson list, the
 * assessment method, free previews, price, and the right next step for this visitor.
 */
export default async function CourseDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const course = await getPublishedCourse(slug);
  if (!course) notFound();
  const s = course.snapshot;
  const actor = await getActor();
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
        Create an account to enrol
      </Link>
    );
  } else if (access?.full && access.reason !== "staff_preview") {
    cta = (
      <Link href={`/academy/${slug}`} className={BTN}>
        Go to the course
      </Link>
    );
  } else if (s.course.isFree || access?.coveredBySubscription) {
    cta = (
      <ActionForm action={enrolFreeAction} redirectTo={`/academy/${slug}`}>
        <input type="hidden" name="courseId" value={course.id} />
        <button className={BTN}>{s.course.isFree ? "Enrol free" : "Start — included in your subscription"}</button>
      </ActionForm>
    );
  } else if (product && paymentsConfigured()) {
    cta = (
      <Link href={`/checkout/${product.sku}`} className={BTN}>
        Enrol · ₹{(product.amount / 100).toLocaleString("en-IN")}
      </Link>
    );
  } else {
    cta = (
      <Link href={`/contact?interest=${encodeURIComponent(s.course.name)}`} className={BTN}>
        Ask about enrolling
      </Link>
    );
  }

  return (
    <div className="mx-auto max-w-[1320px] px-6 pb-24">
      <Link href="/catalog" className="text-[13px] text-muted-foreground hover:text-foreground">
        ← Catalogue
      </Link>
      <div className="mt-6 grid gap-12 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div>
          <p className="text-data text-[11px] tracking-[0.14em] text-subtle">{level ? `LEVEL ${level.sequence} · ${level.displayTitle.toUpperCase()}` : "COURSE"}</p>
          <h1 className="mt-3 text-[clamp(2.2rem,4.5vw,3.6rem)] leading-[1.02]">{s.course.name}</h1>
          {s.course.description && <p className="mt-5 max-w-[65ch] text-[17px] leading-relaxed text-muted-foreground">{s.course.description}</p>}
          {s.course.who && <p className="mt-4 text-[15px]">For: {s.course.who}</p>}

          {s.course.outcomes.length > 0 && (
            <section className="mt-10">
              <h2 className="text-[1.4rem]">What you will be able to do</h2>
              <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[15px]">
                {s.course.outcomes.map((o) => (
                  <li key={o}>{o}</li>
                ))}
              </ul>
            </section>
          )}

          <section className="mt-10">
            <h2 className="text-[1.4rem]">Curriculum</h2>
            <ol className="mt-4 flex flex-col gap-3">
              {s.modules.map((m, i) => (
                <li key={m.id} className="rounded-[var(--radius)] border border-border bg-card px-5 py-4">
                  <p className="text-[15px] font-medium">
                    <span className="text-data mr-2 text-[11px] text-subtle">{String(i + 1).padStart(2, "0")}</span>
                    {m.title}
                  </p>
                  <ul className="mt-2 flex flex-col gap-1 text-[13.5px] text-muted-foreground">
                    {m.lessons.map((l) => (
                      <li key={l.id} className="flex items-baseline justify-between gap-3">
                        {l.freePreview && actor ? (
                          <Link href={`/academy/${slug}/${l.id}`} className="text-brand underline underline-offset-4">
                            {l.title} — free preview
                          </Link>
                        ) : (
                          <span>
                            {l.title}
                            {l.freePreview && " — free preview (sign in)"}
                          </span>
                        )}
                        <span className="text-data shrink-0 text-[11px]">{l.minutes} min</span>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside className="flex h-fit flex-col gap-5 rounded-[var(--radius)] border border-border bg-card p-6 lg:sticky lg:top-28">
          <p className="font-serif-display text-[2rem] leading-none">{s.course.isFree ? "Free" : product ? `₹${(product.amount / 100).toLocaleString("en-IN")}` : "—"}</p>
          {s.course.includedInSubscription && !s.course.isFree && <p className="-mt-3 text-[13px] text-muted-foreground">Also included in All-access subscriptions.</p>}
          {cta}
          <dl className="grid grid-cols-2 gap-3 text-[13px]">
            <div>
              <dt className="text-subtle">Effort</dt>
              <dd>{Math.round(minutes / 60) || "<1"} hours{ s.course.weeks ? ` · ${s.course.weeks}` : ""}</dd>
            </div>
            <div>
              <dt className="text-subtle">Modules</dt>
              <dd>
                {s.modules.length} · {lessons.length} lessons
              </dd>
            </div>
            <div>
              <dt className="text-subtle">Assessment</dt>
              <dd>{assessed.length ? `${assessed.length} assessed lesson${assessed.length === 1 ? "" : "s"}` : "Knowledge checks"}</dd>
            </div>
            <div>
              <dt className="text-subtle">Free previews</dt>
              <dd>{previews.length || "None"}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-subtle">Prerequisites</dt>
              <dd>{s.course.prerequisites.length ? s.course.prerequisites.join("; ") : "None"}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-subtle">Completion</dt>
              <dd>Every lesson complete and every assessment passed earns a verifiable certificate.</dd>
            </div>
          </dl>
          <p className="border-t border-border pt-4 text-[12px] leading-relaxed text-muted-foreground">
            Content effective {when(s.course.effectiveDate)}, next review {when(s.course.reviewDate)}. Educational content only; validate against current official guidance.
          </p>
        </aside>
      </div>
    </div>
  );
}
