import type { PrismaClient, SupportCategory } from "@prisma/client";
import { DEFAULT_SLA } from "../lib/support/sla";

/**
 * Default support teams, category routing, SLA targets and support hours. Idempotent: existing
 * rows are left as a support lead configured them. Team membership is not seeded; leads add
 * people in Admin → Support → Settings (dev accounts: scripts/dev-accounts.ts).
 */
const TEAMS = [
  { key: "general", name: "Learner support", description: "First line for anything not routed elsewhere." },
  { key: "academic", name: "Academic support", description: "Course content, assessments, grading and certificates." },
  { key: "billing", name: "Billing", description: "Payments, subscriptions and refunds." },
  { key: "technical", name: "Technical", description: "Login problems, errors and accessibility issues." },
];

const ROUTES: Record<SupportCategory, string> = {
  ENROLLMENT: "general",
  LOGIN_ACCESS: "technical",
  COURSE_NAVIGATION: "general",
  MODULE_CONTENT: "academic",
  ASSESSMENT: "academic",
  CERTIFICATE: "academic",
  SUBSCRIPTION: "billing",
  PAYMENT: "billing",
  REFUND: "billing",
  TECHNICAL: "technical",
  FACULTY: "academic",
  COMPLAINT: "general",
  PRIVACY_SECURITY: "general",
  OTHER: "general",
};

export async function seedSupport(prisma: PrismaClient) {
  for (const t of TEAMS) await prisma.supportTeam.upsert({ where: { key: t.key }, update: {}, create: t });
  const teams = await prisma.supportTeam.findMany();
  for (const [category, key] of Object.entries(ROUTES) as [SupportCategory, string][]) {
    await prisma.supportCategorySetting.upsert({ where: { category }, update: {}, create: { category, teamId: teams.find((t) => t.key === key)!.id, defaultPriority: category === "COMPLAINT" ? "HIGH" : category === "PRIVACY_SECURITY" ? "URGENT" : "NORMAL" } });
  }
  for (const [priority, sla] of Object.entries(DEFAULT_SLA)) {
    await prisma.supportSlaPolicy.upsert({ where: { priority: priority as keyof typeof DEFAULT_SLA }, update: {}, create: { priority: priority as keyof typeof DEFAULT_SLA, ...sla } });
  }
  await prisma.supportCalendar.upsert({ where: { id: "default" }, update: {}, create: { id: "default" } });
  console.log(`Seeded ${TEAMS.length} support teams, category routing, SLA targets and support hours.`);
}
