# Master implementation plan

Inputs: the blueprint, `docs/audit/REPOSITORY_AUDIT.md`, `docs/research/*`. Earlier phases
(foundation, CMS, learner loop, operations, people, account) are complete and recorded in
`docs/IMPLEMENTATION_PLAN.md` and `docs/FEATURE_MATRIX.md`. This plan covers the work that the
re-audit and research identified. Status is kept current in `PROGRESS.md`.

Effort: S (< half a day), M (about a day), L (several days).

## Dependency graph

```
B1 DB-backed catalogue ──▶ B2 honest pricing & mentoring request ──▶ B3 footer/booking cleanup
B4 Library model + admin ──▶ B5 public library pages (process, glossary, case studies, toolkit, tests)
B6 governance policy page (independent)
B7 console "worked example" label (independent)
B8 CMS: lesson review fields + sources ──▶ B9 compliance dashboard counts lessons past review
B10 CMS: course/module prerequisites ──▶ learner gating
B11 CMS: scheduled expiry (cron) · B12 audio block · B13 templates · B14 bulk actions
B15 bookmarks · B16 self-deactivation · B17 PDF certificate · B18 re-auth for approvals
B19 dependency fixes ──▶ B20 E2E scenarios + axe ──▶ B21 CI workflow
```

## Backlog

| ID | Requirement | Existing / gap | User story & acceptance | Backend / DB | Frontend | Security | Tests | Pri | Effort |
|---|---|---|---|---|---|---|---|---|---|
| B1 | Courses and levels on the public site come from the CMS | Static `lib/data/catalog.ts` (A3, A5) | Visitor sees the three published levels and released courses with live prices; a course archived in the CMS disappears | Read published levels, released snapshots, active products | `/learning-paths`, homepage section, `/courses` → `/catalog` | Public reads only released data | Integration: archived course absent; E2E: catalogue shows seeded course | P1 | M |
| B2 | Pricing reflects real products | Static prices | Every price on `/pricing` equals the active `Product` amount checkout charges | Read active products | `/pricing`, mentoring section | — | Integration: price change after approval shows on pricing | P1 | M |
| B3 | No mocked interactions | A1, A2 | Mentoring request creates a real lead with the chosen session; no invented slots; no countdown to a non-existent cohort | Reuse `submitContact` with interest | BookingPanel → request form; footer facts | Rate limit, PHI screen (existing) | Unit/integration on submitContact with interest | P1 | S |
| B4 | CMS-managed library (glossary, process, case study, toolkit) | Not implemented | Content admin creates an entry, submits it, a reviewer approves, it appears publicly; drafts never public | `LibraryEntry` model, service with review (author ≠ reviewer), PHI screening, sources, review dates, revisions via audit | `/admin/content/library` | `content.*` permissions | Integration: draft hidden, reviewer ≠ author, PHI refused, learner cannot write | P1 | M |
| B5 | Public library pages | Not implemented | `/resources`, glossary search, process library, case studies, leadership toolkit, tests overview from released assessments | Read published entries; assessment summaries from snapshots | New pages, nav links | Answer keys never exposed | E2E: glossary search finds a term | P1 | M |
| B6 | Content review and governance policy | Not implemented | Public page explains review stages, synthetic-data rule, how to report an error | — | `/legal/content-governance` | — | Build | P1 | S |
| B7 | Label the worked-example console | A4 | Every console page says the client is fictional and the data synthetic | — | Banner in `(product)` layout | — | E2E: banner visible | P0 | S |
| B8 | Lesson review metadata | Course-level only | Compliance-sensitive lessons carry owner, last reviewed, next review, sources | `Lesson.lastReviewedAt`, `nextReviewAt`, `sources[]`, `ownerId`; migration; snapshot | Lesson panel | Editing = content.edit | Integration: fields in snapshot; overdue counted | P1 | S |
| B10 | Prerequisites | Not implemented | A learner cannot open a module until its prerequisite module is complete; a course may require another course's certificate | `Module.prerequisiteId`, `Program.requiresCourseId`; snapshot; access check | Module panel; locked state in player | Server-side check | Integration: locked until complete | P1 | M |
| B11 | Scheduled expiry | Not implemented | Course with `expiresAt` is unpublished by cron at that time | `Program.expiresAt`; `runScheduledExpiries` | Workflow panel | content.publish | Integration | P2 | S |
| B12 | Audio block | Not implemented | Author adds an audio file; learners play it | `AUDIO` block kind; media types | Block editor/view | Upload sniffing for audio | Unit: schema | P2 | S |
| B13 | Templates | Not implemented | Author creates a course from a template course | `Program.isTemplate`; duplicate from template | "New from template" | content.create | Integration | P2 | S |
| B14 | Bulk actions | Not implemented | Admin selects several lessons and sets state or archives them in one action, all-or-nothing | Service with per-item checks in one transaction | Checkbox selection in tree | Same permissions as single actions | Integration: one locked item aborts all | P2 | M |
| B15 | Bookmarks | Not implemented | Learner bookmarks a lesson and finds it under Bookmarks | `Bookmark` model | Button + list | Own records only | Integration | P2 | S |
| B16 | Self-service deactivation | Not implemented | Learner deactivates with password confirmation; sessions end | Service + audit | Account page | Fresh session | Integration | P2 | S |
| B17 | Downloadable certificate | HTML only | Holder or anyone with the serial downloads a PDF that matches the verification page | PDF generation (pdfkit if available) | Download link | Revoked certificates marked | Integration: PDF bytes start with `%PDF` | P1 | M |
| B18 | Re-authentication for approvals | Not implemented | Approving a sensitive request needs a sign-in within 15 minutes | Check session age in actions | Prompt to re-sign-in | — | Integration | P1 | S |
| B19 | Dependency advisories | 1 critical, 15 high | Apply non-breaking fixes; move `shadcn` to dev deps; re-run all checks | lockfile | — | — | Full suite | P0 | S |
| B20 | Mandatory E2E scenarios + accessibility | 5 of 15 in browser | Add browser tests for CMS create→review→publish, assessment→score, certificate→verify, support ticket, vendor isolation, audit record; axe scan of key pages | — | — | — | Playwright | P1 | M |
| B21 | CI | None | Typecheck, lint, unit+integration on push | GitHub Actions with Postgres service | — | No secrets needed | Workflow syntax check | P2 | S |

## Execution checklist

- [ ] B19 dependency fixes
- [ ] B7 console label
- [ ] B1 / B2 / B3 catalogue, pricing, mocked interactions
- [ ] B4 / B5 / B6 library and governance
- [ ] B8 / B10 / B11 / B12 / B13 / B14 CMS gaps
- [ ] B15 / B16 / B17 / B18 learner and admin gaps
- [ ] B20 E2E and accessibility
- [ ] B21 CI
- [ ] Threat model, docs, final report
