import Link from "next/link";
import { requireActor } from "@/lib/actor";
import { prisma } from "@/lib/db";
import { PageHead } from "@/components/platform/PlatformShell";
import { Empty, Pill, Table, Td, when } from "@/components/admin/kit";
import { DONE_STATUSES, LEARNER_STATUS_LABEL } from "@/lib/support/states";
import { CATEGORY_LABEL } from "@/lib/services/support/tickets";
import { getSetting } from "@/lib/settings";

export const metadata = { title: "Support" };

export default async function SupportHome() {
  const actor = await requireActor();
  const [tickets, hours] = await Promise.all([
    prisma.supportTicket.findMany({ where: { requesterId: actor.id }, orderBy: { updatedAt: "desc" }, select: { id: true, reference: true, subject: true, status: true, category: true, channel: true, updatedAt: true } }),
    getSetting("support.hours"),
  ]);
  return (
    <div className="mx-auto max-w-[1100px] px-6 py-12">
      <PageHead
        kicker="Support"
        title="How can we help?"
        lede={`We help with enrolment, course access, navigation, assessments, certificates, payments and general educational questions. Support hours: ${hours}. Outside them, your message waits in the queue and we reply in the same thread.`}
        actions={
          <Link href="/support/new" className="inline-flex min-h-11 items-center rounded-[3px] bg-primary px-5 text-[14px] font-medium text-primary-foreground hover:bg-primary-hover">
            Start a conversation
          </Link>
        }
      />
      <p className="mt-6 border-l-2 border-warning pl-3 text-[13px] text-muted-foreground">Support is for platform and learning questions. We cannot give legal, coding, clinical or payer-specific decisions, and you must never share patient information here.</p>
      <div className="mt-8">
        {tickets.length === 0 ? (
          <Empty title="No conversations yet." />
        ) : (
          <Table head={["Reference", "Subject", "Topic", "Status", "Updated"]}>
            {tickets.map((t) => (
              <tr key={t.id}>
                <Td className="text-data text-[12px]">{t.reference}</Td>
                <Td>
                  <Link href={`/support/${t.id}`} className="hover:underline">
                    {t.subject}
                  </Link>
                  {t.channel === "CHAT" && <span className="ml-2 text-[11px] text-subtle">chat</span>}
                </Td>
                <Td>{CATEGORY_LABEL[t.category]}</Td>
                <Td>
                  <Pill tone={DONE_STATUSES.includes(t.status) ? "green" : t.status === "PENDING_SUBSCRIBER" ? "red" : "amber"}>{LEARNER_STATUS_LABEL[t.status]}</Pill>
                </Td>
                <Td>{when(t.updatedAt, true)}</Td>
              </tr>
            ))}
          </Table>
        )}
      </div>
    </div>
  );
}
