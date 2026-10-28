import { area, definePage, design, text } from "../fields";

/** The fields every custom page has: a header, then a layout made in the visual designer. */
export const customPage = (key: string, slug: string, title: string) =>
  definePage({
    key,
    path: `/p/${slug}`,
    label: title,
    group: "Custom pages",
    fields: {
      seoDescription: text("Search description", "", { max: 300, optional: true, help: "Shown by search engines under the page title." }),
      eyebrow: text("Label above the title", "", { max: 60, optional: true }),
      title: text("Title", title, { max: 160 }),
      lead: area("Introduction", "", { max: 600, optional: true }),
      body: design("Page content", { help: "Images on public pages must be marked Public in the media library." }),
    },
  });

export type CustomPageDef = ReturnType<typeof customPage>;
