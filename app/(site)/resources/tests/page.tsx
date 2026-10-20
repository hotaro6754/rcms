import Link from "next/link";
import { PageHeader, Section } from "@/components/site/PageHeader";
import { getPublishedCourse, listPublishedCourses, listPublishedLevels } from "@/lib/services/learning/catalog";
import { flatLessons } from "@/lib/cms/snapshot";
import { SiteLink } from "@/components/site/SiteLink";
import { getPageContent } from "@/lib/site/content";
import { resourcesTestsPage } from "@/lib/site/pages/resources-tests";
import { pageMeta } from "@/lib/seo";

export async function generateMetadata() {
  const c = await getPageContent(resourcesTestsPage);
  return pageMeta({ title: c.seo.title, description: c.seo.description, path: "/resources/tests" });
}

export const revalidate = 300;

/** Assessment facts from released courses only. Questions and answers are never shown here. */
export default async function TestsPage() {
  const [levels, courses, content] = await Promise.all([listPublishedLevels(), listPublishedCourses(), getPageContent(resourcesTestsPage)]);
  const t = content.table;
  const KIND: Record<string, string> = { KNOWLEDGE_CHECK: content.kinds.knowledgeCheck, MODULE_TEST: content.kinds.moduleTest, FINAL: content.kinds.final, ASSIGNMENT: content.kinds.assignment };
  const detail = await Promise.all(courses.map(async (c) => ({ c, course: await getPublishedCourse(c.slug) })));
  return (
    <>
      <PageHeader eyebrow={content.header.eyebrow} title={content.header.title} lead={content.header.lead} />
      <Section>
        {levels.map((l) => {
          const inLevel = detail.filter((d) => d.c.levelId === l.id && d.course);
          if (!inLevel.length) return null;
          return (
            <section key={l.id} className="mb-10">
              <h2 className="text-[1.4rem] leading-tight">{l.displayTitle}</h2>
              <div className="mt-4 overflow-x-auto rounded-[var(--radius)] border border-border bg-card">
                <table className="w-full min-w-[46rem] border-collapse text-left text-[13.5px]">
                  <thead>
                    <tr className="border-b border-border">
                      <th scope="col" className="label-caps px-4 py-3 font-medium">{t.course}</th>
                      <th scope="col" className="label-caps px-4 py-3 font-medium">{t.type}</th>
                      <th scope="col" className="label-caps px-4 py-3 font-medium">{t.questions}</th>
                      <th scope="col" className="label-caps px-4 py-3 font-medium">{t.passMark}</th>
                      <th scope="col" className="label-caps px-4 py-3 font-medium">{t.time}</th>
                      <th scope="col" className="label-caps px-4 py-3 font-medium">{t.attempts}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inLevel.flatMap(({ c, course }) =>
                      flatLessons(course!.snapshot)
                        .filter((x) => x.assessment)
                        .map((x) => {
                          const a = x.assessment!;
                          return (
                            <tr key={a.id} className="border-b border-border last:border-0">
                              <th scope="row" className="px-4 py-3 text-left font-normal">
                                <Link href={`/catalog/${c.slug}`} className="font-medium hover:underline">
                                  {c.name}
                                </Link>
                                <span className="block text-muted-foreground">{a.title}</span>
                              </th>
                              <td className="px-4 py-3">{KIND[a.kind] ?? a.kind}</td>
                              <td className="px-4 py-3">{a.questions.length + a.drawCount}</td>
                              <td className="px-4 py-3">{a.passingScore}%</td>
                              <td className="px-4 py-3">{a.timeLimitMinutes ? `${a.timeLimitMinutes} ${t.minutes}` : t.untimed}</td>
                              <td className="px-4 py-3">{a.maxAttempts ?? t.unlimited}</td>
                            </tr>
                          );
                        }),
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          );
        })}
        {detail.every((d) => !d.course || !flatLessons(d.course.snapshot).some((x) => x.assessment)) && <p className="text-[14.5px] text-muted-foreground">{t.empty}</p>}
        {content.footer.show && (
          <p className="mt-6 text-[13.5px]">
            {content.footer.before} <SiteLink link={content.footer.link} className="underline underline-offset-4" />
            {content.footer.after}
          </p>
        )}
      </Section>
    </>
  );
}
