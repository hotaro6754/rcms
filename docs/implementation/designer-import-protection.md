# Visual designer, document import and content protection

## Visual designer

A drag-and-drop editor, built on Puck (MIT licence, `@puckeditor/core` 0.23.0), for lesson content and custom website pages.

**Where it is used**
- **Lessons:** add a **Visual design** block to a lesson, then click "Open the visual designer". Designs go through the normal course review and release, like any other lesson content. Content Administrators and Super Administrators can edit them.
- **Website:** custom pages (Website › New page) have a designed body. Only the Super Administrator can edit them.

**What you can place**
- **Layout:** sections, columns (2–4, with width ratios and vertical alignment), a freeform canvas, spacers and dividers.
- **Text:** headings (H1–H4), text with bold, italic, lists and links, lists with bullets, numbers or ticks, quotes, callouts and buttons.
- **Media:** images from the media library, video (YouTube, Vimeo, Bunny, Mux, Cloudflare Stream) and tables.
- **Infographics:** key numbers, process steps, timelines, cards and bar charts.
- **Interactive:** accordion, tabs, flip cards, "reveal the answer" and self-check questions. Self-checks are not graded; assessments do that.

**Styling**
- **Text:** font (display, sans, serif or mono), size (11 steps), weight, alignment, italic and capitals.
- **Colour and shape:** text colour, background, border, padding and corner radius.
- **Readability:** the designer warns when a text and background colour pair falls below 4.5:1 contrast.

**Freeform canvas**
- **Editing:** "Open the canvas editor" gives a full-screen canvas. Drag items anywhere and resize them from the corner, or type exact positions. Arrow keys nudge the selected item, and Shift moves it in bigger steps. You can bring items to the front, send them to the back, duplicate them or delete them.
- **What can go on it:** headings, text, images, coloured shapes and badges.
- **Scaling:** positions are stored as percentages, so the layout scales with the page.
- **On phones:** the canvas either stacks its items in reading order (the default) or shrinks the whole layout.

**Safety**
- **Checked on the server:** every design is checked before it is stored (`lib/design/schema.ts`). Only listed components are allowed. Colours must be hex values, sizes come from fixed scales, and links must start with `/`, `#`, `https://` or `mailto:`. Images must be in the media library, and there are limits on size and nesting depth.
- **No code:** there is no HTML, CSS or script anywhere in a design. Text is plain or restricted Markdown, rendered as React text.
- **No third-party loading:** the designer itself loads nothing from other sites. Puck's external font is not used, because the site's security policy blocks third-party CSS.

## Importing a PDF or Word file

In a lesson, add a **Visual design** block and choose a file under "Start from a document". The file is turned into a design and opens in the designer for you to adjust.

**Layout rules** (`lib/design/import/structure.ts`; no AI, and nothing leaves the server):
- Top-level headings become sections, and the document title becomes the page heading.
- A numbered list of 3–8 steps becomes a process diagram.
- A list of "Term: definition" lines becomes flip cards.
- A list of labelled numbers ("Clean claim rate: 92%") becomes key numbers.
- A two-column table of numbers becomes a bar chart and a table.
- Three or more short sub-sections become an accordion.
- "Summary", "Key points" and "Takeaways" sections become a highlighted callout.
- FAQ sections written as questions and answers become an accordion.
- "Note:", "Tip:" and "Warning:" paragraphs become callouts.
- A short section with one picture is laid out as text beside the image.
- Pictures stay where they were. They are saved to the media library as private images, with their metadata removed (up to 40 per file).

**Reading the files**
- **Word (.docx)** files are read through their real structure: headings, lists, tables, bold, italic and links (mammoth).
- **PDFs** are read from their layout (pdf.js):
  - Bigger text becomes headings.
  - Bullet and number markers become lists.
  - Running headers, footers and page numbers are dropped.
  - Embedded pictures are extracted.

**Limits**
- **PDF tables** arrive as text, so check them in the designer.
- **Scanned PDFs** have no text to import. Add them as a view-only document instead.
- **Old .doc files** must be saved as .docx first.
- **Identifiers:** files containing identifiers (Social Security numbers, card numbers and so on) are refused by the same screen that protects all lesson content.

**AI structuring** (better infographics, generated quiz questions) is not switched on. It would send document text to an AI provider, which needs an API key and your explicit approval first.

## Content protection for learners

**What is in place**
- **Lessons:** learners cannot select, copy, cut, drag or right-click inside a lesson.
  - The copy, select-all, save, print and view-source shortcuts do nothing. Normal copy and paste still work inside answer boxes.
  - Printing shows a notice instead of the lesson.
  - The lesson is hidden while the window is in the background, which is when screenshot tools usually take focus. Clicking into a video does not count as leaving.
- **No watermarks:** lessons, images and document pages are shown to learners without any watermark (removed at the owner's request).
- **Which file goes where:** only PDFs can be a **Document (view only)** block. You can choose one from the media library or upload it right in the block's form (it is added to the library too). A Word file is turned into a designed page with a **Design** block started from the document; uploaded to the media library it is only stored, and the block form says so.
- **Documents:** a **Document (view only)** lesson block shows a PDF page by page as images (`/api/doc-pages`). The PDF file itself is never sent to the browser. Requests are limited to 240 pages per 10 minutes per account.
- **Materials:** lesson materials are view-only by default.
  - View-only PDFs are read in the lesson, page by page.
  - Other view-only files are not downloadable at all.
  - The course team can tick "Learners may download this file" for templates that are meant to be taken away.
  - The download route refuses view-only files to learners, whatever link they use.

**What it cannot do:** no website can stop a phone camera or an operating-system screenshot, so these measures are deterrents. They raise the effort rather than making copying impossible. Anyone with developer tools can still see what their own browser shows, and without a watermark a leaked copy cannot be traced to an account.

## For developers

**Code**
- **Design:**
  - Schema and validation: `lib/design/schema.ts`.
  - Rendering, shared by the designer and the learner and website pages: `components/design/views.tsx`, with interactive parts in `components/design/interactive.tsx`.
  - Puck configuration: `components/design/puck-config.tsx`.
  - Designer: `components/design/Designer.tsx`.
  - Canvas editor: `components/design/CanvasEditor.tsx`.
- **Import:** `lib/design/import/{docx,pdf,structure}.ts` and `lib/services/cms/import.ts`.
- **PDF handling:** reading, rendering and page images are in `lib/documents/{pdf,pages}.ts`. Access checks are in `lib/services/learning/{media-access,resource-access}.ts`.
- **Routes:** `/api/doc-pages/[id]/[page]`, `/api/material-pages/[id]/[page]` and the updated `/api/media/[id]` and `/api/materials/[id]`.

**Database:** migrations `0009_design_and_document_blocks` (block kinds `DESIGN` and `DOCUMENT`) and `0010_resource_download_control` (`Resource.downloadable`). Both are additive.

**Dependencies**
- `@puckeditor/core` 0.23.0 (MIT), `mammoth` 1.13.0 (BSD-2), `pdfjs-dist` 6.3.289 (Apache-2.0), `@napi-rs/canvas` 1.0.10 (MIT, native) and `node-html-parser` 9.0.4 (MIT).
- The PDF libraries and mammoth are listed in `serverExternalPackages`, so Next.js loads them at runtime instead of bundling them.
- `mammoth` brings in `argparse` → `sprintf-js`, which has a moderate advisory. It is used only by mammoth's command-line tool, which the app never runs.

**Tests**
- `tests/integration/design.test.ts` covers the import rules for Word and PDF, refusals, design validation, image access in releases, document page counts, view-only materials and unwatermarked page images.
- `tests/e2e/designer.spec.ts` imports a file, edits and styles a heading, drags in a canvas, places an item, saves and reloads, with no console errors.
- `tests/e2e/protection.spec.ts` checks the copy, right-click and print blocking, and the print notice.
