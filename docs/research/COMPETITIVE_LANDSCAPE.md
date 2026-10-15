# Competitive landscape

Research date: 15 October 2026. Source IDs refer to `RESEARCH_SOURCES.md`. **[S]** = figure seen
in a search-result summary, not on the vendor's page; treat prices as indicative and re-check
before using them in pricing decisions. No figure here was invented; where nothing was found the
cell says so.

## 1. Categories

| Category | Examples | Relationship to the Academy |
|---|---|---|
| Professional credentialing bodies | AAPC (CPB, CPC), HFMA (CRCR), AAHAM (CRCS, CRCE), AHIMA | **Substitute and potential partner.** They own the recognised credentials. The Academy cannot and must not claim equivalence; it can prepare people for the work and point to these exams. |
| Healthcare workforce learning platforms | HealthStream (revenue cycle education) | **Direct competitor for B2B team training** in US provider organisations. |
| Practice-management education | PMI (Practice Management Institute) | **Indirect competitor**: practice-office focus. |
| Course marketplaces | Udemy RCM courses | **Substitute** at the low-price end. |
| Indian training institutes | Medhams, ATAL, IHIMC, Greens Technologys, many others | **Direct competitor for the Trainee segment in India**, where much US RCM back-office work is done. |
| General LMS / course platforms | Moodle, Open edX, Canvas, TalentLMS, Thinkific, Teachable, LearnDash | **Infrastructure alternatives**, not content competitors. A competitor could assemble an RCM academy on them. |
| RCM operations vendors / BPOs | R1 RCM, Experian Health and many outsourcing firms | **Potential customers and partners** (they train staff at scale), not competitors. |

## 2. Comparison matrix

| | AAPC | HFMA CRCR | AAHAM | HealthStream | Indian institutes | Udemy | This Academy (built) |
|---|---|---|---|---|---|---|---|
| Audience | Billers, coders, individuals | Revenue cycle staff | Revenue cycle staff → executives | Provider organisations (B2B) | Freshers seeking AR/billing jobs | Individuals | Trainee → Professional → Leadership |
| Credential | CPB/CPC exams (recognised) | CRCR (recognised) | CRCS / CRCE ladder (recognised) | Courses and CE within customer orgs | Institute certificates; some prepare for CPC/CPB [S14] | Course certificate | Academy certificate with public serial verification; **not** an accredited credential |
| Price signal | CPB package $1,495–$2,495 shown as 50% off, promotion possibly expired; exam $399 separately [S1, S2]; RCM course $149/$199 member/non-member; denial course $249/$299 [S3, S4] | $399 non-member, includes study material and exam; included with some memberships [S5, S6] | Not found | Not public; quote-based [S11] | ₹10,999–₹44,500 for certificates of 3 weeks to 1 year [S15, S16] | Low (not verified) | ₹1,499/month, ₹14,999/year plans seeded; course products configurable |
| Format | Self-paced, instructor-led 16-week option [S1] | Self-study ~10–14 h, 75 MCQ in 90 min, 70% pass [S6] | 2-hour proctored exam, three sections [S8] | "Over 2,000" RCM courses, onboarding and upskilling pathways [S11] | Classroom and online, night-shift job focus [S14, S18] | Video | Structured lessons, scenario questions, timed assessments, manual grading |
| Team / corporate features | Not found | Organisational purchase discount for 10+ candidates [S6] | Not found | Core of the offer [S11] | Not found | Udemy Business (not researched) | Organisations, seats, groups, group assignment, manager progress view |
| Leadership / governance content | Not found in results | Not found | CRCE executive level [S9] | Not found in results | Not found | Not found | Leadership level: SLA/KPI, capacity, governance, plus Governance Labs |

Gaps where nothing was found are gaps in **my evidence**, not proof that the vendor lacks the feature.

## 3. General LMS platforms (as alternatives to building)

| Platform | Model | Licence / price evidence | Strength | Weakness evidence |
|---|---|---|---|---|
| Moodle | Self-hosted OSS | GPL-3.0 [F1] | Huge plugin ecosystem | Reviewers want stronger reporting; setup and admin effort cited [S28] |
| Open edX | Self-hosted OSS | AGPL-3.0 [F2] | Scale, MOOC heritage | Heavy Python/JS stack; AGPL network-use obligations |
| Canvas | SaaS + AGPL core | AGPL-3.0 [F3] | Academic market leader | Academic orientation |
| TalentLMS | SaaS | Third-party prices conflict ($119–$579/month tiers) [S25] | Ease of use praised [S28] | "Needs an administrator UX overhaul"; basic course builder; limited reporting graphics (individual reviews) [S29, S30] |
| Thinkific | SaaS | $49–$199/month, 0% platform fee [S26] | Creator focus | Limited custom reporting and quiz detail per a low-confidence aggregate [S31] |
| Teachable | SaaS | $39–$399/month; 7.5% fee on Starter [S26] | Simple selling | Transaction fee on entry tier |
| LearnDash | WordPress plugin | $199–$799/year licences [S27] | WordPress ecosystem | Hosting, add-ons and maintenance on the buyer |

**Implication:** none of these provides RCM-specific curriculum, scenario banks, compliance
review workflow for healthcare content, or vendor/SME management out of the box. The decision to
keep the custom platform (already built, see `docs/audit/REPOSITORY_AUDIT.md`) stands; replacing it
with a general LMS would trade working domain features for generic ones.

## 4. Market context (industry surveys)

| Finding | Source |
|---|---|
| 41% of providers report denial rates of 10% or more, rising each year since 2022; 43% report being understaffed; 90% of denials are reworked with some human review; survey of 250 professionals, fielded 23 June–3 July 2025 | Experian Health State of Claims 2025 [S21] |
| "Just over 40%" of providers see staff training and accountability as top opportunities to reduce denials | Experian blog [S22] |
| 92% of revenue cycle executives said new staff make errors that hurt claims; turnover 11–40% at 80% of organisations (200 executives, Nov 2023) | Experian 2023 via Becker's [S23] |

All three are vendor-run surveys (Experian sells RCM software) and reached me only as search
summaries. They are directionally useful (training is a recognised lever on denials, and new-hire
error is a recognised cost) but should not be quoted as market statistics without opening the
primary reports.

## 5. Where the Academy sits

- It **cannot** compete on credential recognition with AAPC, HFMA or AAHAM, and must not imply it
  does. Positioning: *job-ready practice and operations governance*, complementary to those exams.
- It **can** compete with Indian institutes on transparency (public curriculum, verifiable
  certificates, assessed scenarios rather than attendance) and with HealthStream-type libraries
  on **depth in RCM operations and leadership**, which the evidence above did not show elsewhere.
- BPOs and provider revenue cycle departments are the most plausible paying customers for team
  plans, given the survey evidence on new-hire error and turnover; this is a hypothesis to test,
  not a validated finding.
