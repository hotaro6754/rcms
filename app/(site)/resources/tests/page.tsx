import Link from "next/link";
import { PageHeader, Section } from "@/components/site/PageHeader";
import { getPublishedCourse, listPublishedCourses, listPublishedLevels } from "@/lib/services/learning/catalog";
import { flatLessons } from "@/lib/cms/snapshot";

export const metadata = { title: "Tests and assessments", description: "What each released course assesses, how long it takes and what it takes to pass." };
export const revalidate = 300;

const KIND: Record<string, string> = { KNOWLEDGE_CHECK: "Knowledge check", MODULE_TEST: "Module test", FINAL: "Final assessment", ASSIGNMENT: "Assignment" };

/** Assessment facts from released courses only. Questions and answers are never shown here. */
export default async function TestsPage() {
  const [levels, courses] = await Promise.all([listPublishedLevels(), listPublishedCourses()]);
  const detail = await Promise.all(courses.map(async (c) => ({ c, course: await getPublishedCourse(c.slug) })));
  return (
    <>
      <PageHeader eyebrow="Resources" title="Tests and assessments" lead="Assessments are graded on the server against the released version of the course. Scenario questions use synthetic, de-identified data. A certificate needs every lesson complete and every assessment passed." />
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
                      <th scope="col" className="label-caps px-4 py-3 font-medium">Course · assessment</th>
                      <th scope="col" className="label-caps px-4 py-3 font-medium">Type</th>
                      <th scope="col" className="label-caps px-4 py-3 font-medium">Questions</th>
                      <th scope="col" className="label-caps px-4 py-3 font-medium">Pass mark</th>
                      <th scope="col" className="label-caps px-4 py-3 font-medium">Time</th>
                      <th scope="col" className="label-caps px-4 py-3 font-medium">Attempts</th>
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
                              <td className="px-4 py-3">{a.timeLimitMinutes ? `${a.timeLimitMinutes} min` : "untimed"}</td>
                              <td className="px-4 py-3">{a.maxAttempts ?? "unlimited"}</td>
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
        {detail.every((d) => !d.course || !flatLessons(d.course.snapshot).some((x) => x.assessment)) && <p className="text-[14.5px] text-muted-foreground">No released course has an assessment yet.</p>}
        <p className="mt-6 text-[13.5px]">
          Worked examples: <Link href="/resources/case-studies" className="underline underline-offset-4">case studies</Link>.
        </p>
      </Section>
    </>
  );
}
