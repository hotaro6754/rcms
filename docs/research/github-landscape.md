# GitHub landscape

Updated 16 October 2026. Repositories checked during the build (F1–F9, licences read from the
repository pages) are in `OPEN_SOURCE_AUDIT.md`. The owner's brief adds three (U13–U15); they were
**not re-inspected here**, so licence and maintenance statements are the brief's and must be
verified before any reuse.

| ID | Repository | Licence (as reported) | Decision |
|---|---|---|---|
| U13 | https://github.com/classroomio/classroomio | AGPL-3.0 (brief) | Study only (org model, certificate lifecycle). Do not import: AGPL obligations and a different stack would replace working code |
| U14 | https://github.com/TIM-JYU/TIM | MIT (brief) | Study the idea of interactive documents; RCMS implements its own case workbench |
| U15 | https://github.com/koosty/open-edu | Not verified | Study only; licence, maintenance and security unverified |
| F1–F3 | Moodle, Open edX, Canvas | GPL/AGPL | Not adopted (Decision 2) |
| F4 | Payload CMS | MIT | Not adopted now; built-in CMS already covers needs |
| F5 | pdf-lib | MIT, unmaintained since 2022 | Avoided; pdfkit used (Decision 8) |
| F6, F8 | Chatwoot, Zammad | MIT* / AGPL | Not adopted; ticketing built in-app with routing and SLA |
| F7 | Metabase | AGPL + commercial | Internal analytics only, if ever |

Libraries actually added: `pdfkit` 0.20.2 (MIT), `@anthropic-ai/sdk` 0.131.0 (MIT, optional
provider), `@axe-core/playwright` 4.13.0 (MPL-2.0, dev only). Each was pinned to a release at least
two weeks old.
