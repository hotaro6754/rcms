# Research sources and access log

Research performed **15 October 2026** from a cloud development container. This file records
what was consulted, how, and what could not be reached. Every other research document cites
sources by the IDs below.

## How sources were accessed

| Method | Worked? | Notes |
|---|---|---|
| Web search (search engine result summaries) | Yes | Results arrive as titles, URLs and summaries. Figures marked **[S]** in other documents came this way: the primary page was **not** opened by me. |
| Direct page fetch: github.com | Yes | Licences and star counts marked **[F]** were read from the repository page. |
| Package registry (`npm view`) | Yes | Versions, licences and last-publish dates marked **[N]**. |
| Direct page fetch: aapc.com, healthstream.com, experian.com, businesswire.com, beckershospitalreview.com | **No** | DNS refused by the environment's network policy. Their figures are only available as [S]. |
| Reddit (search, page fetch, JSON API) | **No** | The search tool refuses reddit.com for its crawler, and the network proxy refuses the host. **No Reddit discussion was examined.** |
| X / Twitter | Searched, nothing relevant | One search restricted to x.com returned vendor marketing posts and unrelated content; nothing usable as user evidence. |
| Product Hunt | Not attempted | Low relevance for this category relative to the remaining budget. |

**Consequence:** this research does not contain first-hand community evidence. The "user pain
points" are drawn from review-site summaries, industry surveys and job postings, and are labelled
as such. Before committing money to a differentiator, run interviews (see
`USER_PAIN_POINTS.md` §4).

## Source register

| ID | Source | URL | Access | Used for |
|---|---|---|---|---|
| S1 | AAPC CPB complete training package | https://aapc.com/training/cpb-complete-training-package.aspx | [S] | CPB pricing tiers |
| S2 | Careers360 listing of AAPC CPB | https://www.careers360.com/college/59732/certificate/587788 | [S] | CPB price corroboration |
| S3 | AAPC Revenue Cycle Management course | https://www.aapc.com/education/continuing-education/revenue-cycle-management-course | [S] | RCM course price |
| S4 | AAPC Denial resolution and management course | https://www.aapc.com/education/continuing-education/denial-resolution-and-management-training | [S] | Denial course price |
| S5 | HFMA certification programs overview (Aug 2024 PDF) | https://hfma.org/wp-content/uploads/2024/08/HFMA-Certification-Programs-Overview_Aug2024_Final.pdf | [S] | CRCR price |
| S6 | MD Clarity on CRCR | https://www.mdclarity.com/blog/crcr-certification | [S] | CRCR exam format |
| S7 | HFMA certification maintenance FAQ | https://www.hfma.org/certification/maintenance/ | [S] | Recertification |
| S8 | AAHAM CRCS | https://aaham.org/page/CRCS | [S] | CRCS scope and format |
| S9 | AAHAM certification | https://aaham.org/Certification | [S] | Certification ladder |
| S10 | AHIMA revenue cycle education | https://www.ahima.org/education-events/revenue-cycle/ | [S] | Revenue Cycle Trainer course |
| S11 | HealthStream revenue cycle education | https://www.healthstream.com/lp/revenue-cycle-education | [S] | B2B RCM course library |
| S12 | PMI Revenue Cycle Management Mastery | https://www.pmimd.com/onlinetraining/productpage/index.php?prodID=346 | [S] | Practice-focused RCM course |
| S13 | Udemy RCM courses | https://www.udemy.com/course/revenue-cycle-management/ | [S] | Low-cost individual courses |
| S14 | Medhams (India) | https://m.indiamart.com/medhams | [S] | Indian institute offering AR caller and denial training |
| S15 | ATAL Institute fees 2026 | https://atalinstitute.com/medical-billing-coding-course-fees-2026-basic-advanced-admission/ | [S] | Indian price points |
| S16 | IHIMC medical billing course | https://ihimc.com/medical-billing-course | [S] | Indian price point |
| S17 | Greens Technologys RCM training, Chennai | https://greenstechnologys.com/RCM-training-in-chennai.html | [S] | AR workflow content |
| S18 | MedTerm RCM AR caller posting | https://jobs.weekday.works/ar-caller-at-medtermrcm-4394468033 | [S] | Entry route: trainee AR roles, night shift |
| S19 | Acurus AR analyst posting | https://job-boards.greenhouse.io/acurussolutions/jobs/4618945006 | [S] | Experience expectations |
| S20 | MedicalBillingandCoding.org on scams | https://www.medicalbillingandcoding.org/recognize-industry-scams/ | [S] | Credibility red flags |
| S21 | Experian Health State of Claims 2025 (press release) | https://www.businesswire.com/news/home/20250922969006/en/ | [S] | Denials, understaffing, rework |
| S22 | Experian Health State of Claims 2025 (blog) | https://www.experian.com/blogs/healthcare/healthcare-claim-denials-statistics-state-of-claims-report/ | [S] | Training as a denial lever |
| S23 | Becker's summary of Experian 2023 staffing survey | https://go.beckershospitalreview.com/financewp/short-staffed-for-the-long-term-where-revenue-cycle-departments-go-from-here | [S] | New-hire errors, turnover |
| S24 | MedCity News on RCM staff shortages (2023) | http://medcitynews.com/2023/11/rcm-staff-shortage-healthcare/ | [S] | Shortage context |
| S25 | TalentLMS pricing (aggregators) | https://costbench.com/software/lms/talentlms-lms/ ; https://elearningindustry.com/directory/elearning-software/talentlms/pricing | [S] | Conflicting price points |
| S26 | Thinkific / Teachable pricing comparisons | https://schoolmaker.com/blog/thinkific-vs-teachable | [S] | Plans and transaction fees |
| S27 | LearnDash pricing | https://www.schoolmaker.com/blog/learndash-pricing | [S] | Licence tiers |
| S28 | G2 Moodle vs TalentLMS | https://www.g2.com/compare/moodle-vs-talentlms | [S] | Reporting and admin effort themes |
| S29 | Capterra TalentLMS reviews | https://www.capterra.com/p/132935/TalentLMS/reviews/?page=11 | [S] | Admin UX complaints |
| S30 | Softwarefinder TalentLMS reviews | https://softwarefinder.com/lms/talentlms/reviews?page=4 | [S] | Course builder and reporting complaints |
| S31 | RFP.wiki Thinkific vs TalentLMS | https://www.rfp.wiki/vendors/talentlms/thinkific | [S] | Low-confidence aggregate (appears machine-generated) |
| S32 | 1EdTech Open Badges 3.0 conformance guide | https://standards.1edtech.org/open-badges/specifications/standards/v3p0/cert | [S] | Verifiable credential standard |
| F1 | moodle/moodle | https://github.com/moodle/moodle | [F] | GPL-3.0, 7.5k stars |
| F2 | openedx/openedx-platform | https://github.com/openedx/edx-platform | [F] | AGPL-3.0, 8.2k stars |
| F3 | instructure/canvas-lms | https://github.com/instructure/canvas-lms | [F] | AGPL-3.0, 6.9k stars |
| F4 | payloadcms/payload | https://github.com/payloadcms/payload | [F] | MIT, 45.3k stars, Next.js native |
| F5 | Hopding/pdf-lib | https://github.com/Hopding/pdf-lib | [F] | MIT, 8.7k stars, 279 open issues |
| F6 | chatwoot/chatwoot | https://github.com/chatwoot/chatwoot | [F] | MIT stated; `enterprise/` folder licence not stated on page |
| F7 | metabase/metabase | https://github.com/metabase/metabase | [F] | AGPL + commercial |
| F8 | zammad/zammad | https://github.com/zammad/zammad | [F] | AGPL-3.0 |
| F9 | ueberdosis/tiptap | https://github.com/ueberdosis/tiptap | [F] | MIT core; Pro extensions paid |
| N1 | npm registry | `npm view <pkg> version license time.modified` | [N] | pdf-lib 1.17.1 MIT last published 2022-05-12; @react-pdf/renderer 4.9.0 MIT 2026-08-27; pdfkit 0.20.2 MIT 2026-09-07; @axe-core/playwright 4.13.0 MPL-2.0 2026-10-09; @tiptap/react 3.32.0 MIT; @casl/ability 7.0.2 MIT; payload 3.90.2 MIT |
