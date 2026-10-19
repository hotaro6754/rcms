import { describe, expect, it } from "vitest";
import { area, changedKeys, definePage, group, image, link, list, paragraphs, resolvePage, safeHref, safeImageSrc, text, texts, toggle, validatePage } from "@/lib/site/fields";
import { BUILT_IN_PAGES } from "@/lib/site/registry";

const page = definePage({
  key: "t",
  path: "/t",
  label: "Test",
  group: "Pages",
  fields: {
    hero: group("Opening", { title: text("Title", "Hello", { max: 20 }), lead: area("Lead", "Lead text", { optional: true }) }),
    cta: link("Button", { label: "Go", href: "/go" }),
    photo: image("Photo", { src: "", alt: "" }, { optional: true }),
    show: toggle("Show", true),
    notes: texts("Notes", ["a", "b"], { maxItems: 3 }),
    items: list("Items", { name: text("Name", "") }, [{ name: "One" }], { max: 2, min: 1, titleField: "name" }),
  },
});

const good = () => ({
  hero: { title: "Hi", lead: "" },
  cta: { label: "Go", href: "/go" },
  photo: { src: "", alt: "" },
  show: false,
  notes: ["x"],
  items: [{ name: "A" }],
});

describe("checking edits", () => {
  it("accepts content that fits the page's fields", () => {
    expect(validatePage(page, good()).ok).toBe(true);
  });

  it("names the field that is wrong, through groups and lists", () => {
    const r1 = validatePage(page, { ...good(), hero: { title: "x".repeat(21), lead: "" } });
    expect(r1).toMatchObject({ ok: false, path: "hero.title" });
    expect(!r1.ok && r1.error).toMatch(/^Opening: “Title” must be 20 characters or fewer/);
    const r2 = validatePage(page, { ...good(), items: [{ name: "" }] });
    expect(!r2.ok && r2.error).toMatch(/^Items › 1: “Name” cannot be empty/);
    expect(validatePage(page, { ...good(), items: [] }).ok).toBe(false);
    expect(validatePage(page, { ...good(), items: [{ name: "a" }, { name: "b" }, { name: "c" }] }).ok).toBe(false);
    expect(validatePage(page, { ...good(), notes: ["a", "b", "c", "d"] }).ok).toBe(false);
  });

  it("refuses fields the page does not have, so nothing extra can be stored", () => {
    expect(validatePage(page, { ...good(), script: "<script>" }).ok).toBe(false);
    expect(validatePage(page, { ...good(), hero: { title: "Hi", lead: "", html: "<b>" } }).ok).toBe(false);
  });

  it("only allows safe link and image addresses", () => {
    for (const ok of ["/contact", "#faq", "https://example.org/x", "mailto:hello@example.org"]) expect(safeHref(ok)).toBe(true);
    for (const bad of ["javascript:alert(1)", "//evil.example", "http://plain.example", "data:text/html,x", "JAVASCRIPT:alert(1)", " "]) expect(safeHref(bad)).toBe(false);
    expect(validatePage(page, { ...good(), cta: { label: "x", href: "javascript:alert(1)" } }).ok).toBe(false);
    expect(safeImageSrc("/api/media/cm1abcdefghij")).toBe(true);
    expect(safeImageSrc("/media/founder.jpg")).toBe(true);
    for (const bad of ["https://evil.example/x.png", "/media/../.env", "javascript:x", "/api/media/x;y"]) expect(safeImageSrc(bad)).toBe(false);
    expect(validatePage(page, { ...good(), photo: { src: "https://evil.example/a.png", alt: "" } }).ok).toBe(false);
  });
});

describe("reading content back", () => {
  it("uses the defaults where nothing is stored", () => {
    expect(resolvePage(page.fields, null)).toEqual({
      hero: { title: "Hello", lead: "Lead text" },
      cta: { label: "Go", href: "/go" },
      photo: { src: "", alt: "" },
      show: true,
      notes: ["a", "b"],
      items: [{ name: "One" }],
    });
  });

  it("falls back field by field when a stored value no longer fits", () => {
    const r = resolvePage(page.fields, { hero: { title: "x".repeat(50) }, cta: { label: "Bad", href: "javascript:alert(1)" }, show: false, items: "nope", removed: 1 });
    expect(r.hero.title).toBe("Hello");
    expect(r.hero.lead).toBe("Lead text");
    expect(r.cta).toEqual({ label: "Go", href: "/go" });
    expect(r.show).toBe(false);
    expect(r.items).toEqual([{ name: "One" }]);
    expect(r).not.toHaveProperty("removed");
  });

  it("does not let stored content change the defaults it was merged over", () => {
    const r = resolvePage(page.fields, null);
    r.items.push({ name: "Two" });
    expect(resolvePage(page.fields, null).items).toHaveLength(1);
  });

  it("reports which fields changed and splits paragraphs", () => {
    expect([...changedKeys(page.fields, null, { ...good(), cta: { label: "Go", href: "/go" } })].sort()).toEqual(["hero", "items", "notes", "show"]);
    expect(paragraphs("One.\n\n  Two.\n \nThree.")).toEqual(["One.", "Two.", "Three."]);
  });

  it("ships every built-in page with defaults that pass its own checks", () => {
    for (const def of BUILT_IN_PAGES) {
      const r = validatePage(def, resolvePage(def.fields, null));
      expect(r.ok ? "ok" : `${def.key}: ${r.error}`).toBe("ok");
    }
  });

  it("gives every built-in page a unique key and address", () => {
    expect(new Set(BUILT_IN_PAGES.map((p) => p.key)).size).toBe(BUILT_IN_PAGES.length);
    expect(new Set(BUILT_IN_PAGES.map((p) => p.path)).size).toBe(BUILT_IN_PAGES.length);
  });
});
