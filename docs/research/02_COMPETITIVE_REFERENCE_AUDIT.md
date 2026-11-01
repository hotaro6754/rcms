# 02 — Competitive reference audit

Inspected live on 2026-11-01 in the in-app browser at 1440×900. "Observed" = seen or measured on the live page (screenshots, DOM/CSS inspection, clicking). "Recommendation" = what RCMExcel should take from it. Optional cookie banners were declined where they appeared.

## Primary references

### 01 Experian Health — https://www.experian.com/healthcare/
- **Observed**: utility bar (Consumer / Small Business / Business, About, Support, Global Sites) above a primary bar: *Solutions, About, Insights & Support, Markets We Serve*, **Contact Us** button, Client Sign In, search. "Solutions" opens a two-pane mega menu: left, categories with small icons (Revenue Cycle Management, Data and Analytics, Patient Engagement, Identity Management, Regulatory Solutions); right, the chosen category's pages (Streamline Patient Access, Enhance Patient Collections, Improve Claims Management, Audit Payer Performance, Optimize Revenue Cycle). Homepage: one hero statement + single CTA, then three outcome columns each with one button ("Revenue cycle management solutions", "Data and analytics", "Regulatory solutions"). Roboto, centred section titles, generous whitespace.
- **Does well**: groups many products under a few plain category names; every homepage block ends in one specific CTA.
- **Adapt**: few top-level categories; a short, specific CTA at the end of each section.
- **Don't copy**: purple/magenta brand, stock-glossy hero art, two-level hover cascades (slow to scan).

### 02 AAPC Revenue Cycle Training — https://www.aapc.com/business/revenue-cycle-training
- **Observed**: utility links (What's New, About Us, Support, Cart, Sign In, Sign Up) + primary nav *Certifications, Education, Events, Resources, Software and Services, Shop, Membership*. "Education" opens on click into grouped columns with small headings (Education Overview, Prerequisites, Exam Preparation → CPC/CPB…, Continuing Education → CEUs, Webinars, Workshops…) and a shaded secondary column (Institution Solutions). Page structure: H1 → "Invest in your team's future" → "Our trainings are customized" (bulleted topics) → "High-demand training examples" (E/M, Risk adjustment, CDI…) → "Here's how it works" → "Our trainers" → case study → "Have a question?".
- **Does well**: navigation labels are the nouns a professional is looking for; the training page reads top to bottom as *why → what → examples → how → who → proof → contact*.
- **Adapt**: noun-based menu names; column headings inside menus; a predictable section order ending in an enquiry.
- **Don't copy**: the depth of the menu (seven top items with nested lists) — RCMExcel has far less to list.

### 03 Guidewire — https://www.guidewire.com/
- **Observed**: *Products, Customers, Partners, Resources, About* + search, language, Sign In, **Request a Demo**. "Products" opens a full-width panel: a left intro column (title, one-paragraph description, "Product Overview" button) and four labelled columns (CORE PRODUCTS, ANALYTICS, TECHNOLOGY, SOLUTIONS, SERVICES) of plain links. Homepage sections: platform statement, three value columns, product family grid (Software, Partners, Community, Digital, Professional Services and Education…), "Proven Experience. Earned Trust." customer stories, "The Numbers Behind the Platform".
- **Does well**: the intro column tells you what the whole group is before you pick an item.
- **Adapt** (used directly): the panel layout — intro + main link on the left, labelled columns on the right.
- **Don't copy**: navy-and-gold identity, event carousel hero, unverifiable "numbers" blocks.

### 04 MBS RCM — https://www.mbsrcm.com/
- **Observed** (DOM/CSS inspected): service cards are `article.rounded-2xl.border.bg-card.p-5.shadow-card` with `transition-all` 150ms `cubic-bezier(0.4,0,0.2,1)`, `hover:-translate-y-1.5` (6px) and `hover:border-lime/50`; card shadow `0 18px 45px -22px` navy at 28%. Each card: small tinted icon tile, title, one-line description. "Who We Serve" cards add a 128px image strip and a "Learn More →" link. A dashboard-style panel (KPI tiles, A/R aging bars, top denial reasons) sits beside a dark CTA card. Specialties are an auto-scrolling marquee (78s) with edge masks. No GSAP/AOS globals on the page (Vite bundle); entrance motion is light.
- **Does well**: cards are calm — small lift, border tint, no rotation or pointer-follow; every card leads somewhere.
- **Adapt** (used directly): `.site-card` — hairline border, soft navy shadow, 4px lift + border tint toward the accent on hover/focus-within, 200ms, disabled on touch.
- **Don't copy**: the marquee (motion that never stops), the stock "doctor with arms crossed" style imagery, dark green/lime brand, testimonial and percentage claims.

### 05 Relias — https://www.relias.com/
- **Observed**: *Solutions, Who We Serve, Why Relias, Resources, Company* + search, Log In, **Request a Demo**. "Solutions" opens columns headed LEARNING →, COMPLIANCE →, PERFORMANCE →, QUALITY →, RECRUITING →; every item is **a title plus a one-line description** ("Continuing Education — Offer clinicians training to meet license requirements"), with "VIEW ALL SOLUTIONS →" at the foot. Homepage: H1 + one CTA beside a collage of real staff photography, five solution cards, "Why Relias" (five proof points), three large numbers, latest articles, testimonials, "Want to learn more?".
- **Does well**: item descriptions let a visitor choose without opening pages; photography is of real-looking care staff, not posed models.
- **Adapt** (used directly): title + one-line description for every menu item; column headings; a single "overview" link per menu.
- **Don't copy**: green brand, award badges, customer counts.

## Additional references

| Site | Observed | Take | Avoid |
|---|---|---|---|
| AGS Health — agshealth.com | Nav *Solutions, Services (Patient Access / HIM and Clinical / Patient Financial Services)…*; full-bleed photo hero, client logo strip | Grouping services by front / middle / back of the revenue cycle (confirms our phase grouping) | Client logo walls (we have none and must not imply any) |
| Waystar — waystar.com | *Our platform, Clients + partners, About, Insights + resources*, Contact / Log in / Request demo; Montserrat; client stories as H2s | "+" pairing of related nouns keeps the bar short | Dramatic landscape hero unrelated to the work |
| HealthStream — healthstream.com | Utility bar + primary nav, serif display headline with italic emphasis, outcome sections, FAQ | FAQ/disclosure for detail without length | Over-styled serif + italic (what we moved away from) |
| Medbridge — medbridge.com | Utility links (Contact Sales, Help, Pricing, Sign In); "Who we serve", "Explore resources" | Pricing as a first-class link | — |
| HFMA — hfma.org | *Discover, Guidance, News & Articles, Education & Events, Career Resources* | Professional-association tone; "Career Resources" as a category | Membership-centric IA |
| AHIMA — ahima.org | Mega menu *About, Membership, Certification, Advancement, Publications* with sub-items | Career-advancement framing for a professional audience | — |
| Huron — huronconsultinggroup.com | *What We Do, How We Think, Who We Are, Careers*; dark full-bleed video hero | Plain-language section names | Dark cinematic hero, letter-spaced animated H2s |
| Ensemble Health Partners — ensemblehp.com | *Results, Approach, Insights, About Us, Careers*; stat row renders **"$0B / 0%"** until JS count-up runs | Anti-pattern noted: numbers must render their real value without JavaScript (our count-up starts from the real value in the HTML) | Count-ups that show zero |
| TalentLMS — talentlms.com | Pricing / Login / Request a demo; benefit-led H2s | Short, specific section headings | Generic SaaS marketing tone |
| Access Healthcare — accesshealthcare.com | Rebrand holding page (only Contact / Search, one H2) | — | Limitation: no navigation to study |
| R1 RCM — r1rcm.com | **Access Denied** (bot protection) | — | Limitation: not inspected |

## Principles carried into the redesign

1. Five or six noun-based top-level menus plus one plain link (Pricing) and one primary button.
2. Mega menu = intro column with a main link + labelled columns of *title + one-line description* (Guidewire layout, Relias item pattern).
3. Calm cards: hairline, soft shadow, 4px lift and accent-tinted border, 200ms; no tilt, no pointer-follow (MBS).
4. Real photography for people and workplaces; drawn diagrams for processes (Relias, AAPC).
5. Each section ends in one specific next step (Experian, AAPC).
6. No content that only scrolling reveals; numbers render without JS (Ensemble counter-example).
