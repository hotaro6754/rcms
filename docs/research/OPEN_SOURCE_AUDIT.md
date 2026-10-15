# Open-source audit

Research date: 15 October 2026. **[F]** = read on the GitHub repository page; **[N]** = npm
registry. Licence statements are what the repository page shows; for any component we adopt,
the full licence file must be read before shipping.

## 1. Build-versus-adopt decision for the platform core

The repository already contains a working custom platform on Next.js, Prisma and Better Auth
(see `docs/audit/REPOSITORY_AUDIT.md`), with tests. The question is therefore not "which LMS to
start from" but "is there a reason to replace or embed one".

| Project | Licence | Signals | Fit | Recommendation |
|---|---|---|---|---|
| Moodle | GPL-3.0 [F1] | 7.5k stars, PHP | Complete LMS; would replace, not extend, the codebase | **Do not adopt.** Rewrite cost; loses the release/review workflow, vendor and finance domain built here. |
| Open edX | AGPL-3.0 [F2] | 8.2k stars, Python/JS | Large-scale course delivery | **Do not adopt.** Operational weight; AGPL obligations on modifications served over the network. |
| Canvas LMS | AGPL-3.0 [F3] | 6.9k stars, Ruby | Academic LMS | **Do not adopt.** Same reasons. |
| Payload CMS | MIT [F4]; payload 3.90.2 [N1] | 45.3k stars; runs inside a Next.js `/app` folder | Headless CMS with admin UI | **Not now.** The domain CMS here enforces RCM-specific review, PHI screening and released snapshots. Payload would need all of that rebuilt as hooks. Revisit if non-course marketing content grows large. |

## 2. Components

| Need | Candidate | Licence | Maintenance signal | Decision |
|---|---|---|---|---|
| PDF certificates | pdf-lib | MIT [F5] | 1.17.1, last published 2022-05-12 [N1]; 279 open issues [F5] | **Avoid**: no release in over four years. |
| PDF certificates | pdfkit | MIT | 0.20.2, published 2026-09-07 [N1] | **Adopt** if the registry is reachable from the build: maintained, server-side, small. |
| PDF certificates | @react-pdf/renderer | MIT | 4.9.0, published 2026-08-27 [N1] | Viable; heavier (React renderer + layout engine). pdfkit preferred for a single certificate layout. |
| Accessibility checks | @axe-core/playwright | MPL-2.0 [N1] | 4.13.0, 2026-10-09 | **Adopt as a dev dependency.** MPL-2.0 is file-level copyleft; using it unmodified in tests imposes no obligation on our code. |
| Rich-text editing | Tiptap | MIT core; Pro extensions need a subscription [F9] | 3.32.0 [N1] | **Defer.** The block editor with restricted Markdown already prevents stored XSS by design; a rich editor would need a strict schema and server-side sanitising. Consider for long-form text blocks later. |
| Permission library | CASL | MIT | 7.0.2 [N1] | **Not needed.** The in-code permission matrix with service-layer checks is simpler, fully tested and reviewable in diffs. |
| Support desk / live chat | Chatwoot | MIT stated; `enterprise/` folder licence not stated on page [F6] | 37.8k stars | **Candidate for real-time chat** if polling proves insufficient. Self-hosting adds a Rails stack; check the enterprise folder's licence first. |
| Support desk | Zammad | AGPL-3.0 [F8] | 6.0k stars | Not preferred: AGPL and a separate Rails stack for a need already met in-app. |
| BI / reporting | Metabase | AGPL open-source edition + commercial licence [F7] | 49.7k stars | **Optional, internal only**: could sit read-only over a reporting replica for ad-hoc analysis. Not embedded in the product (AGPL / embedding terms). |
| Verifiable credentials | Open Badges 3.0 (1EdTech spec) | Specification | Aligns with W3C Verifiable Credentials 2.0 [S32] | **Roadmap**: issue certificates as signed Open Badges 3.0 in addition to the public verification page, so they verify without our server. |

## 3. Rules applied

- No code was copied from any project in this audit.
- Copyleft (GPL/AGPL/MPL) components are not linked into the application; MPL tooling is
  allowed in tests only.
- A new runtime dependency needs: an active release in the last 12 months, a permissive licence,
  and a concrete need the existing code does not meet.
