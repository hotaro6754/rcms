import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { AuthorisationError } from "@/lib/errors";
import * as site from "@/lib/services/site/pages";
import { resolvePage, type PageContent } from "@/lib/site/fields";
import { aboutPage } from "@/lib/site/pages/about";
import { resetDb, staff } from "../helpers";

beforeEach(resetDb);

/** The editor returns content typed for any page; these tests read the About page. */
const about = (v: unknown) => v as PageContent<typeof aboutPage>;

const edited = (title: string) => ({ ...resolvePage(aboutPage.fields, null), header: { ...resolvePage(aboutPage.fields, null).header, title } });

describe("who may edit the website", () => {
  it("is the Super Administrator only", async () => {
    for (const role of ["ACADEMY_DIRECTOR", "CONTENT_ADMIN", "COMPLIANCE_REVIEWER", "AUDITOR"] as const) {
      const someone = await staff(role);
      await expect(site.listPages(someone)).rejects.toBeInstanceOf(AuthorisationError);
      await expect(site.saveDraft(someone, "about", edited("x"), 0)).rejects.toBeInstanceOf(AuthorisationError);
      await expect(site.createCustomPage(someone, { title: "Page", slug: "page" })).rejects.toBeInstanceOf(AuthorisationError);
    }
    const sa = await staff("SUPER_ADMIN");
    expect((await site.listPages(sa)).some((p) => p.key === "about")).toBe(true);
  });
});

describe("draft, publish, history", () => {
  it("keeps drafts out of the published page until publishing, and versions every publish", async () => {
    const sa = await staff("SUPER_ADMIN");
    const { lockVersion } = await site.saveDraft(sa, "about", edited("New title"), 0);
    let p = await site.pageForEditor(sa, "about");
    expect(about(p.published).header.title).toBe(aboutPage.fields.header.fields.title.default);
    expect(about(p.draft).header.title).toBe("New title");

    // A second editor who loaded the page before that save cannot overwrite it.
    await expect(site.saveDraft(sa, "about", edited("Stale"), 0)).rejects.toThrow(/changed since you opened it/);

    await site.publish(sa, "about", { note: "Shorter title" });
    p = await site.pageForEditor(sa, "about");
    expect(about(p.published).header.title).toBe("New title");
    expect(p.draft).toBeNull();
    expect(p.versions).toMatchObject([{ version: 1, note: "Shorter title" }]);
    await expect(site.publish(sa, "about")).rejects.toThrow(/no changes to publish/);

    await site.saveDraft(sa, "about", edited("Second"), lockVersion + 1);
    await site.publish(sa, "about");
    await site.restoreVersion(sa, "about", 1);
    p = await site.pageForEditor(sa, "about");
    expect(about(p.draft).header.title).toBe("New title");
    expect(about(p.published).header.title).toBe("Second");
    await site.discardDraft(sa, "about");

    await site.resetToDefault(sa, "about");
    p = await site.pageForEditor(sa, "about");
    expect(about(p.published).header.title).toBe(aboutPage.fields.header.fields.title.default);
    expect(p.versions.map((v) => v.version)).toEqual([3, 2, 1]);
    expect(p.versions[0].reset).toBe(true);
    expect(await prisma.auditLog.count({ where: { entity: "SitePage", entityId: "about", action: "publish" } })).toBe(2);
  });

  it("refuses content that does not fit the page, and images that are not public", async () => {
    const sa = await staff("SUPER_ADMIN");
    await expect(site.saveDraft(sa, "about", { ...edited("x"), header: { eyebrow: "", title: "x", lead: "y" } }, 0)).rejects.toThrow(/Page header: “Label” cannot be empty/);
    await expect(site.saveDraft(sa, "about", { ...edited("x"), closing: { ...edited("x").closing, primary: { label: "x", href: "javascript:alert(1)" } } }, 0)).rejects.toThrow(/Links must start with/);
    await expect(site.saveDraft(sa, "nope", edited("x"), 0)).rejects.toThrow(/does not exist/);

    const asset = await prisma.mediaAsset.create({ data: { kind: "IMAGE", title: "Team", fileKey: "k1", mimeType: "image/png", sizeBytes: 10, isPublic: false } });
    const { key } = await site.createCustomPage(sa, { title: "With image", slug: "with-image" });
    const content = resolvePage(site.definitionFor(key, { custom: true, slug: "with-image", title: "With image" })!.fields, null) as Record<string, unknown>;
    content.body = { root: { props: {} }, content: [{ type: "Image", props: { id: "i1", mediaId: asset.id, alt: "The team" } }] };
    await site.saveDraft(sa, key, content, 0);
    // A design with a script-like component never gets in.
    await expect(site.saveDesignField(sa, key, "body", { root: { props: {} }, content: [{ type: "Html", props: { id: "x", html: "<script>" } }] })).rejects.toThrow(/not a component the designer offers/);
    await expect(site.saveDesignField(sa, key, "title", { root: { props: {} }, content: [] })).rejects.toThrow(/not a design/);
    await expect(site.publish(sa, key)).rejects.toThrow(/not a public image/);
    // (saveDesignField refusals above did not change the draft.)
    await prisma.mediaAsset.update({ where: { id: asset.id }, data: { isPublic: true } });
    await expect(site.publish(sa, key)).resolves.toMatchObject({ version: 1, path: "/p/with-image" });
  });
});

describe("custom pages", () => {
  it("are created at a unique address, published, renamed and deleted for good", async () => {
    const sa = await staff("SUPER_ADMIN");
    await expect(site.createCustomPage(sa, { title: "Bad", slug: "Not A Slug" })).rejects.toThrow(/lowercase letters/);
    const { key } = await site.createCustomPage(sa, { title: "Corporate training", slug: "corporate-training" });
    await expect(site.createCustomPage(sa, { title: "Again", slug: "corporate-training" })).rejects.toThrow(/already uses that address/);
    await expect(site.resetToDefault(sa, key)).rejects.toThrow(/no default copy/);
    await site.renameCustomPage(sa, key, "Team training");
    expect((await site.listPages(sa)).find((p) => p.key === key)).toMatchObject({ label: "Team training", path: "/p/corporate-training", version: 0 });

    await expect(site.deleteCustomPage(sa, "about")).rejects.toThrow(/cannot be deleted/);
    await site.deleteCustomPage(sa, key);
    expect((await site.listPages(sa)).some((p) => p.key === key)).toBe(false);
    await expect(site.pageForEditor(sa, key)).rejects.toThrow(/has been deleted/);
    await expect(site.createCustomPage(sa, { title: "Reuse", slug: "corporate-training" })).rejects.toThrow(/already uses that address/);
    expect(await prisma.auditLog.count({ where: { entity: "SitePage", entityId: key, action: "delete" } })).toBe(1);
  });
});
