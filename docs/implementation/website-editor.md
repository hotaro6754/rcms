# Website editor

`/admin/site` lets the **Super Administrator** change the public website's copy without editing code: words, links, buttons, images, list items and whether a section is shown. They can also create and delete whole pages.

## Who can use it

Only the Super Administrator. The editor checks the `site.edit` permission, which no other role includes. The same check runs in the page, in every server action and in every service function. Roles were otherwise left unchanged, as requested.

There is no second-person approval: one person holds this authority. Every save, publish, reset, restore, rename and delete is written to the audit log.

## How an edit goes live

1. **Edit.** Open a page from the list. Every editable part of the page has a field, grouped the way the page is laid out. Lists of items (beliefs, FAQs, footer links, legal clauses and so on) can be added to, reordered and removed. Text fields show a "Use original" link when they differ from the shipped copy.
2. **Save draft.** Drafts are invisible to visitors. If someone else saved the page after you opened it, saving is refused rather than overwriting their work.
3. **Preview on the site.** Opens the real page showing the draft, with a yellow bar ("Preview: you are seeing unpublished changes") and an "Exit preview" link. Only a Super Administrator who is signed in sees drafts, even with the preview cookie.
4. **Publish.** The live page changes straight away; its cached copy is refreshed. Each publish is a numbered version with an optional note.
5. **History.** Any version can be restored into the draft, checked and published again. "Reset to the original copy" goes back to the copy in the code; the edits stay in the history.

Legal pages (terms, privacy, refund, disclaimer, content governance) need the publisher to tick "I have checked this legal text". The text should be reviewed by a lawyer first; the platform makes no compliance claims.

## Custom pages

"New page" creates a page at `/p/<address>`. It has a title, an introduction and a list of blocks: headings, paragraphs, quotes, images and buttons. A custom page is not visible until it is published.

Deleting a custom page takes it offline immediately. Its history is kept for the audit trail, and its address is not reused.

To link to a custom page, add its address to the navigation or footer in **Navigation and footer**.

## What it can and cannot change

- **Text, links, buttons and section visibility** on the pages listed under Website pages.
- **Images:** chosen from the media library. Only images marked **Public** there can be published; upload them under Learning › Media library first.
- **Not prices, courses, levels or library entries.** These come from their own admin screens (Finance › Plans and pricing, Learning › Levels and courses, Library). Checkout always charges the price in the database, so a price can never be edited as page text.
- **Not layout or styling.** Fields hold plain text only. HTML, scripts and styles cannot be entered, and links must start with `/`, `#`, `https://` or `mailto:`. An edit can change what a page says, not what it runs.

## Safety rails

- **Content is checked against each page's field definitions when saved and when published.** That includes lengths, required fields, list sizes, link and image addresses, and no unknown fields.
- **A stored value that no longer fits its field falls back to the original copy for that field only.** This can happen when a later code change alters a page's fields, so a bad or outdated edit cannot break a page.
- **If the database is unreachable, pages show their original copy.**

## For developers

- **Field builders, validation and merging** are in `lib/site/fields.ts`. It is pure and safe to use on the client.
- **Page definitions** are in `lib/site/pages/*.ts`. The registry is `lib/site/registry.ts`, and a page appears in the editor once it is listed there.
- **Read side:** `getPageContent(def)` in `lib/site/content.ts`. It caches published content with the tag `site:<key>` and serves drafts in preview.
- **Service:** `lib/services/site/pages.ts`. Server actions are in `lib/actions/site.ts`.
- **Editor UI:** `components/site-editor/`. Admin pages are under `app/admin/site/`, and custom pages are served by `app/(site)/p/[slug]/page.tsx`.
- **Preview:** `/api/site/preview?key=<key>` and `/api/site/preview/exit`.
- **Tables:** `SitePage` and `SitePageVersion` (migration `0008_site_content`, additive).
- **Making new copy editable:**
  1. Add a field to the page's definition, with the current text as its default.
  2. Read it from `getPageContent` in the page.
  3. Client components receive content as props; they never read the database.
- **Tests:**
  - `tests/unit/site.test.ts` checks validation and fallbacks, and that every page's shipped defaults pass its own rules.
  - `tests/integration/site.test.ts` checks permissions, drafts, versions, rollback, images and custom pages.
  - `tests/e2e/site-editor.spec.ts` covers the whole journey in a browser.
