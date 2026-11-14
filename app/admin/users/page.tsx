import Link from "next/link";
import { requirePagePermission } from "@/lib/actor";
import { prisma } from "@/lib/db";
import { PageHead } from "@/components/platform/PlatformShell";
import { ActionForm } from "@/components/admin/ActionForm";
import { BTN, BTN_OUTLINE, Field, FIELD, Panel, Pill, Table, Td, when } from "@/components/admin/kit";
import { createAccountAction, setAccountKindAction } from "@/lib/actions/admin";

export const metadata = { title: "Admins and students" };

/**
 * Two kinds of account and nothing else: administrators (run the Academy) and students (learn).
 * Accounts are created here, because web sign-up is closed until launch; a change of type takes
 * effect at once and is audited.
 */
export default async function UsersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const actor = await requirePagePermission(["users.view", "roles.request"]);
  const { q = "" } = await searchParams;
  const search = q.trim();
  const where = search ? { OR: [{ name: { contains: search } }, { email: { contains: search } }] } : {};
  const people = await prisma.user.findMany({
    where: { ...where, role: { not: "VENDOR" } },
    orderBy: [{ createdAt: "desc" }],
    take: 200,
    select: { id: true, name: true, email: true, role: true, status: true, twoFactorEnabled: true, lastLoginAt: true, createdAt: true, _count: { select: { staffRoles: true, enrolments: true } } },
  });
  const isAdmin = (u: (typeof people)[number]) => u._count.staffRoles > 0 || ["OWNER", "ADMIN", "TRAINER"].includes(u.role);
  const admins = people.filter(isAdmin);
  const students = people.filter((u) => !isAdmin(u));

  const row = (u: (typeof people)[number], admin: boolean) => (
    <tr key={u.id}>
      <Td>
        <span className="flex items-center gap-3">
          <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-[12px] font-semibold ${admin ? "bg-[#0b1230] text-white" : "bg-brand/15 text-brand"}`}>
            {u.name
              .split(" ")
              .map((x) => x[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()}
          </span>
          <span className="min-w-0">
            {admin ? (
              <span className="block font-medium">{u.name}</span>
            ) : (
              <Link href={`/admin/subscribers/${u.id}`} className="block font-medium hover:underline">
                {u.name}
              </Link>
            )}
            <span className="block text-[12px] text-muted-foreground">{u.email}</span>
          </span>
        </span>
      </Td>
      <Td>
        <Pill tone={u.status === "ACTIVE" ? "green" : "amber"}>{u.status.toLowerCase().replace(/_/g, " ")}</Pill>
      </Td>
      <Td>{admin ? (u.twoFactorEnabled ? <Pill tone="green">2-step on</Pill> : <Pill tone="amber">2-step off</Pill>) : `${u._count.enrolments} course${u._count.enrolments === 1 ? "" : "s"}`}</Td>
      <Td>{when(u.lastLoginAt, true)}</Td>
      <Td className="text-right">
        {u.id !== actor.id && (
          <ActionForm action={setAccountKindAction} confirm={admin ? `Make ${u.name} a student? They lose admin access immediately.` : `Make ${u.name} an administrator? They get full access to the admin.`} success="Done.">
            <input type="hidden" name="userId" value={u.id} />
            <input type="hidden" name="kind" value={admin ? "STUDENT" : "ADMIN"} />
            <button className="text-[12.5px] underline underline-offset-4 hover:text-primary">{admin ? "Make student" : "Make admin"}</button>
          </ActionForm>
        )}
      </Td>
    </tr>
  );

  return (
    <div className="mx-auto max-w-[1320px] px-6 py-10">
      <PageHead kicker="People" title="Admins and students" lede="Two kinds of account. Admins run the Academy; students learn. Create accounts here and change someone's type in one click. Every change is recorded in the audit log." />

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex flex-col gap-8">
          <form className="flex gap-2">
            <input name="q" defaultValue={search} placeholder="Search by name or email" className={`${FIELD} max-w-md`} />
            <button className={BTN_OUTLINE}>Search</button>
          </form>
          <section>
            <h2 className="mb-3 flex items-baseline gap-2 text-[1.05rem] font-semibold">
              Admins <span className="text-[13px] font-normal text-muted-foreground">{admins.length}</span>
            </h2>
            <Table head={["Admin", "Status", "Security", "Last sign-in", ""]} minWidth="44rem" empty="No admins match.">
              {admins.map((u) => row(u, true))}
            </Table>
          </section>
          <section>
            <h2 className="mb-3 flex items-baseline gap-2 text-[1.05rem] font-semibold">
              Students <span className="text-[13px] font-normal text-muted-foreground">{students.length}</span>
            </h2>
            <Table head={["Student", "Status", "Enrolled", "Last sign-in", ""]} minWidth="44rem" empty="No students yet. Create one on the right.">
              {students.map((u) => row(u, false))}
            </Table>
          </section>
        </div>

        <Panel title="Create an account">
          <ActionForm action={createAccountAction} className="flex flex-col gap-3" resetOnSuccess success="Account created. Share the email and password with the person; they can change the password after signing in.">
            <div role="radiogroup" aria-label="Account type" className="grid grid-cols-2 gap-2">
              {[
                ["STUDENT", "Student", "Learns: courses, assessments, certificates"],
                ["ADMIN", "Admin", "Runs the Academy: everything in the admin"],
              ].map(([v, label, hint], i) => (
                <label key={v} className="cursor-pointer rounded-[10px] border border-border p-3 text-[13px] has-[:checked]:border-brand has-[:checked]:bg-brand/5">
                  <input type="radio" name="kind" value={v} defaultChecked={i === 0} className="sr-only" />
                  <span className="block font-semibold">{label}</span>
                  <span className="mt-0.5 block text-[11.5px] leading-snug text-muted-foreground">{hint}</span>
                </label>
              ))}
            </div>
            <Field label="Full name" htmlFor="cn">
              <input id="cn" name="name" required minLength={2} className={FIELD} />
            </Field>
            <Field label="Email" htmlFor="ce">
              <input id="ce" name="email" type="email" required className={FIELD} />
            </Field>
            <Field label="Temporary password" htmlFor="cp" hint="At least 10 characters. Share it privately.">
              <input id="cp" name="password" type="text" required minLength={10} autoComplete="new-password" className={FIELD} />
            </Field>
            <button className={`${BTN} w-full`}>Create account</button>
          </ActionForm>
          <p className="mt-4 text-[12px] leading-relaxed text-muted-foreground">
            Enrol a student on a course from their profile under <Link href="/admin/subscribers" className="underline underline-offset-4">Students</Link>. Admins set up two-step verification at first sign-in.
          </p>
        </Panel>
      </div>
    </div>
  );
}
