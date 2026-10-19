import Link from "next/link";
import { requirePagePermission } from "@/lib/actor";
import { PageHead } from "@/components/platform/PlatformShell";
import { ActionForm } from "@/components/admin/ActionForm";
import { BTN, Field, FIELD, Pill, Table, Td, when } from "@/components/admin/kit";
import { createCustomPageAction } from "@/lib/actions/site";
import { listPages } from "@/lib/services/site/pages";

export const metadata = { title: "Website" };

const GROUPS = ["Site-wide", "Pages", "Legal", "Custom pages"] as const;

/** Every public page whose copy can be changed here, and new pages made from scratch. */
export default async function SitePagesIndex() {
  const actor = await requirePagePermission("site.edit");
  const pages = await listPages(actor);
  return (
    <div className="mx-auto max-w-[1100px] px-6 py-10">
      <PageHead
        kicker="Website"
        title="Website pages"
        lede="Change the words, links, images and sections of the public site without touching code. Edits are saved as drafts you can preview; visitors see them only after you publish, and every published version can be restored."
      />
      {GROUPS.map((g) => {
        const rows = pages.filter((p) => p.group === g);
        if (!rows.length && g !== "Custom pages") return null;
        return (
          <section key={g} className="mt-10">
            <h2 className="text-[1.1rem]">{g}</h2>
            <div className="mt-3">
              <Table head={["Page", "Address", "Status", "Last published"]} minWidth="40rem" empty={rows.length === 0 ? "No custom pages yet." : undefined}>
                {rows.map((p) => (
                  <tr key={p.key}>
                    <Td>
                      <Link href={`/admin/site/${p.key}`} className="font-medium hover:underline">
                        {p.label}
                      </Link>
                    </Td>
                    <Td className="text-data text-[12.5px]">{p.path}</Td>
                    <Td>
                      <span className="flex flex-wrap gap-1.5">
                        {p.hasDraft && <Pill tone="amber">draft</Pill>}
                        {p.group === "Custom pages" ? (
                          <Pill tone={p.version ? "green" : "grey"}>{p.version ? "live" : "not published"}</Pill>
                        ) : (
                          <Pill tone={p.edited ? "green" : "grey"}>{p.edited ? "edited" : "original copy"}</Pill>
                        )}
                      </span>
                    </Td>
                    <Td className="text-[12.5px]">{p.publishedAt ? `${when(p.publishedAt, true)} · v${p.version}` : "—"}</Td>
                  </tr>
                ))}
              </Table>
            </div>
          </section>
        );
      })}

      <section className="mt-10 max-w-xl">
        <h2 className="text-[1.1rem]">New page</h2>
        <p className="mt-1 text-[13px] text-muted-foreground">A page of headings, text, images, quotes and buttons, at its own address under /p/. Link to it from the navigation or footer.</p>
        <ActionForm action={createCustomPageAction} className="mt-4 flex flex-col gap-3">
          <Field label="Title" htmlFor="np-title">
            <input id="np-title" name="title" required minLength={2} maxLength={160} className={FIELD} placeholder="Corporate training" />
          </Field>
          <Field label="Address" htmlFor="np-slug" hint="Lowercase letters, numbers and hyphens. The page will be at /p/ followed by this.">
            <input id="np-slug" name="slug" required minLength={2} maxLength={60} pattern="[a-z0-9]+(-[a-z0-9]+)*" className={FIELD} placeholder="corporate-training" />
          </Field>
          <button className={`${BTN} w-fit`}>Create page</button>
        </ActionForm>
      </section>
    </div>
  );
}
