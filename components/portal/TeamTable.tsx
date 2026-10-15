import { Pill, Table, Td, when } from "@/components/admin/kit";
import type { teamReport } from "@/lib/services/people/corporate";

type Rows = Awaited<ReturnType<typeof teamReport>>["rows"];

/** Team progress: courses, completions and certificates per person. Shared by admin and managers. */
export function TeamTable({ rows }: { rows: Rows }) {
  if (!rows.length) return <p className="text-[13px] text-muted-foreground">No one holds a seat yet.</p>;
  return (
    <Table head={["Person", "Groups", "Courses", "Lessons done", "Certificates", "Last sign-in"]} minWidth="44rem">
      {rows.map((r) => (
        <tr key={r.member.id}>
          <Td>
            {r.member.user.name}
            <span className="block text-[12px] text-muted-foreground">{r.member.user.email}</span>
          </Td>
          <Td className="text-[12.5px]">{r.groups.join(", ") || "—"}</Td>
          <Td>
            <ul className="text-[12.5px]">
              {r.enrolments.map((e) => (
                <li key={e.programId} className="flex items-center gap-1.5">
                  {e.program.name} {e.state === "COMPLETED" ? <Pill tone="green">done</Pill> : e.state !== "ACTIVE" ? <Pill>{e.state.toLowerCase()}</Pill> : null}
                </li>
              ))}
              {r.enrolments.length === 0 && <li className="text-muted-foreground">none</li>}
            </ul>
          </Td>
          <Td>{r.lessonsCompleted}</Td>
          <Td>{r.certificates.length}</Td>
          <Td>{when(r.member.user.lastLoginAt)}</Td>
        </tr>
      ))}
    </Table>
  );
}
