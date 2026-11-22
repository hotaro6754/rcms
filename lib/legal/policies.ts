/**
 * The public policies the Website Development Specification (§12.1) requires beyond the five
 * editable legal pages (terms, privacy, refund, disclaimer, content governance), drafted from
 * the RCMExcel Legal & Compliance Master Pack v1.0.
 *
 * DRAFTS. The pack is explicit: these templates must be adapted to the final legal entity,
 * platform practice and markets, and approved by qualified Indian and US counsel, before they
 * are published or paid enrolment opens. Bracketed fields are placeholders. The pages are not
 * reachable while the site is in pre-launch lockdown (lib/launch.ts), and every page carries a
 * draft notice until LEGAL_POLICIES_APPROVED=true is set after sign-off.
 */

export interface Policy {
  slug: string;
  title: string;
  summary: string;
  docId?: string;
  clauses: { heading: string; paragraphs: string[] }[];
}

const ENTITY = "[full legal entity name], trading as RCMExcel";

export const POLICIES: Policy[] = [
  {
    slug: "learner-terms",
    title: "Learner Terms and Conditions",
    summary: "Course access, learner obligations and platform rules.",
    docId: "RCM-WEB-TERMS-001",
    clauses: [
      { heading: "Contracting entity", paragraphs: [`These Terms govern access to courses, assessments and learning materials supplied by ${ENTITY} ("RCMExcel", "we", "us"). Registered address: [address]. Support: [email].`] },
      { heading: "Acceptance", paragraphs: ["By creating an account, purchasing a course or accessing paid content you agree to these Terms and the course-specific conditions shown before purchase. If you do not agree, do not purchase or use the service."] },
      { heading: "Eligibility and account", paragraphs: ["The platform is intended for adult professional learners aged [18] and over. Provide accurate account information, protect your credentials and tell us at once about any unauthorised access. Your account is personal: do not share it."] },
      { heading: "Nature of the service", paragraphs: ["RCMExcel provides independent professional education in US Healthcare Revenue Cycle Management, operational excellence and leadership. Courses are educational. They are not legal, tax, clinical, coding-audit or payer-specific professional advice.", "RCMExcel is not a university or government agency. Unless expressly stated and documented, courses and awards are not academic degrees, professional licences, government qualifications or externally accredited credentials."] },
      { heading: "Enrolment and access", paragraphs: ["Course scope, access period, prerequisites, assessment requirements and support level are shown before purchase. Access is personal, non-transferable and subject to payment.", "Course materials (video, slides and reading) are provided for viewing on the platform only. They cannot be downloaded, copied, printed, recorded or redistributed."] },
      { heading: "Fees and taxes", paragraphs: ["Prices, currency, applicable taxes and any recurring charges are displayed before checkout. Payments are processed by our payment provider; RCMExcel does not store full card details."] },
      { heading: "Course changes", paragraphs: ["We may update content to reflect regulatory, coding, payer or operational changes. Material changes affecting course scope or access will be communicated, and unavailable content may be replaced with a substantially equivalent resource."] },
      { heading: "Acceptable use", paragraphs: ["Do not share login credentials; scrape, screen-record or copy the platform or its materials; redistribute course content; upload malware; impersonate another learner; disrupt assessments; or submit Protected Health Information (PHI) or confidential third-party data anywhere on the platform."] },
      { heading: "Suspension", paragraphs: ["We may suspend access for non-payment, security threats, fraud, harassment, IP infringement, assessment misconduct or material breach, after a fair process where appropriate."] },
      { heading: "Complaints and governing law", paragraphs: ["Contact [grievance email] first. We acknowledge complaints within [X] business days and aim to give a reasoned response within [Y] business days. Mandatory statutory rights and forums are unaffected. Governing law and forum: [to be confirmed after India and US counsel review]."] },
    ],
  },
  {
    slug: "cookies",
    title: "Cookie Policy",
    summary: "The cookies the platform sets and why.",
    clauses: [
      { heading: "What we use", paragraphs: ["RCMExcel uses only cookies that are strictly necessary for the platform to work: a session cookie that keeps you signed in, and security cookies that protect sign-in and forms. They are first-party, are not used for advertising and do not track you across other sites."] },
      { heading: "Analytics and marketing", paragraphs: ["We do not currently use analytics, advertising pixels or third-party social trackers. If that changes, this policy will be updated before they are switched on and, where the law requires it, you will be asked for consent first, with a way to change your choice at any time."] },
      { heading: "Device storage", paragraphs: ["Your browser may remember small preferences on your device, such as the lesson format you chose last (video, slides or reading). These stay on your device and are not sent to us."] },
      { heading: "Managing cookies", paragraphs: ["You can delete or block cookies in your browser settings. Blocking the strictly necessary cookies will prevent you from signing in."] },
    ],
  },
  {
    slug: "academic-policy",
    title: "Academic and Examination Policy",
    summary: "Assessment rules, attempts, pass criteria, integrity and appeals.",
    docId: "RCM-ACAD-POL-002",
    clauses: [
      { heading: "Academic standards", paragraphs: ["Every course has a defined audience, prerequisites, learning outcomes, module map, estimated study time, assessment plan and source list. Content distinguishes federal law, state law, payer policy, coding convention, industry practice and RCMExcel recommendation, and is reviewed when a material rule, manual, code set or payer policy changes.", "All case examples are fictional or properly de-identified. Learners are never asked to provide identifiable patient data."] },
      { heading: "Assessments", paragraphs: ["Courses use module quizzes and a final examination with multiple-choice and scenario-based questions. The pass mark, time limit, number of attempts and waiting period between attempts are published on the course page before enrolment. The proposed default pass mark is 75% [subject to owner approval].", "Answers are marked on the server against an approved key. Answer keys are never shown before submission unless the course's feedback setting says so."] },
      { heading: "Integrity", paragraphs: ["Plagiarism, impersonation, collusion, use of prohibited aids and sharing of assessment content are misconduct. Generative AI may not be used during closed-book examinations unless the course says otherwise.", "Suspected misconduct is reviewed impartially: the learner is told of the allegation and may respond before a proportionate outcome is decided (no breach, warning, resit, score cancellation, suspension or certificate action)."] },
      { heading: "Accommodations", paragraphs: ["Learners who need reasonable adjustments can request them through support before an attempt. Adjustments do not change the competencies an assessment measures."] },
      { heading: "Appeals", paragraphs: ["Appeals may be submitted within 30 calendar days of a decision on grounds of process error, scoring error, conflict of interest, identity mismatch or failure to apply published policy. Appeals are reviewed by someone not involved in the original decision, where practicable, and receive a reasoned response."] },
    ],
  },
  {
    slug: "certification",
    title: "Certification Disclaimer",
    summary: "What an RCMExcel Academy award is, and what it is not.",
    docId: "RCM-CERT-TPL-001",
    clauses: [
      { heading: "Independent academy awards", paragraphs: ["Certificates issued by RCMExcel Academy are independent academy awards based on the published course curriculum and applicable assessment requirements."] },
      { heading: "What they are not", paragraphs: ["They are not government-issued qualifications, university degrees, occupational or professional licences, or certifications awarded, endorsed, approved or accredited by HHS, CMS, the US Department of Education, AHIMA, AAPC, AMA or any other external professional association, regulator or certification body."] },
      { heading: "Describing your award", paragraphs: ["Describe the nature and scope of the award accurately, for example on a CV or profile. A certificate of completion confirms completion of the stated learning only; it does not by itself certify occupational competence."] },
      { heading: "Verification", paragraphs: ["Every certificate has a unique ID that can be checked on the public verification page, which shows only the minimum information needed to confirm it is genuine and current. Certificates can be revoked or reissued under the Academic and Examination Policy."] },
    ],
  },
  {
    slug: "no-employment-guarantee",
    title: "No Employment Guarantee",
    summary: "RCMExcel does not promise jobs, interviews, salary or promotion.",
    clauses: [
      { heading: "No guarantee", paragraphs: ["RCMExcel does not guarantee employment, job placement, interviews, recruitment, salary increases, promotions or any other career outcome."] },
      { heading: "What our courses are for", paragraphs: ["Our courses are designed to support professional growth, strengthen operational knowledge and enhance workplace performance. Individual results depend on many factors outside our control."] },
      { heading: "No recruitment services", paragraphs: ["RCMExcel is not a recruitment agency, does not place candidates with employers and does not share learner information with employers for recruitment."] },
    ],
  },
  {
    slug: "no-mentoring",
    title: "No Mentoring Disclaimer",
    summary: "What the current offering does not include.",
    clauses: [
      { heading: "Not offered", paragraphs: ["The current RCMExcel offering does not include one-to-one mentoring, personal coaching, career counselling, recruitment or job placement. Courses are self-paced and delivered on the platform."] },
      { heading: "Support", paragraphs: ["Learner support covers access, technical and course-content questions through the support channel shown in your account. It is not individual career or professional advice."] },
    ],
  },
  {
    slug: "copyright",
    title: "Copyright and Intellectual Property Policy",
    summary: "Who owns the content, how you may use it, and how to report infringement.",
    docId: "RCM-IP-POL-001",
    clauses: [
      { heading: "Ownership", paragraphs: ["Course videos, slide decks, study material, diagrams, SOPs, quizzes, case studies, text, branding and platform software are owned by RCMExcel or licensed to it."] },
      { heading: "Your licence", paragraphs: ["Enrolment gives you a limited, revocable, non-transferable, personal licence to view the materials on the platform for your own learning. It does not permit downloading, copying, screen recording, printing, resale, republication, sharing or commercial reuse."] },
      { heading: "Third-party material", paragraphs: ["CPT is a registered trademark and copyrighted work of the American Medical Association; UB-04 materials are copyrighted by the American Hospital Association. RCMExcel uses protected code-set and form content only within the scope of the applicable licence, or not at all. References to CMS, HHS, AMA, AHA, payers, professional associations and other organisations are for educational identification only and do not imply sponsorship, partnership, endorsement or accreditation."] },
      { heading: "Reporting infringement", paragraphs: ["If you believe content on RCMExcel infringes your rights, write to [IP email] identifying the work, the material and your contact details. We acknowledge and log every report, may restrict access while we review it, and remove, replace, license or restore content based on a documented decision."] },
    ],
  },
  {
    slug: "hipaa",
    title: "HIPAA Educational Disclaimer",
    summary: "HIPAA training is educational awareness only. Never share PHI.",
    docId: "RCM-HIPAA-POL-001",
    clauses: [
      { heading: "Educational only", paragraphs: ["RCMExcel provides independent educational training about HIPAA and healthcare privacy and security. RCMExcel is not the US Department of Health and Human Services and does not issue HHS HIPAA certifications.", "An RCMExcel certificate confirms only the learning or assessment it describes. It does not establish that a learner, employer, covered entity or business associate is HIPAA compliant, and it does not replace workforce training, policies, risk analysis, safeguards, contracts or other obligations required by law."] },
      { heading: "No Protected Health Information", paragraphs: ["Do not upload, disclose, reproduce or share identifiable patient information, PHI, medical records, claim documents, EOBs or confidential organisational information anywhere on RCMExcel: not in assessments, support requests or any other communication. All examples in our courses use synthetic data.", "If PHI is submitted by mistake, we restrict access to it, securely delete it and assess the incident under our incident procedure."] },
      { heading: "Applicability", paragraphs: ["Whether HIPAA applies to an organisation depends on its covered-entity or business-associate status and its activities, not simply on handling healthcare-related information. Seek qualified advice for your organisation's obligations."] },
    ],
  },
  {
    slug: "editorial",
    title: "Editorial Disclaimer",
    summary: "Journal articles are general information, not official guidance.",
    clauses: [
      { heading: "General information", paragraphs: ["Articles in the RCMExcel Journal are educational and informational. They are not legal advice, official regulatory guidance, payer-specific instructions or a substitute for an organisation's policies and compliance program."] },
      { heading: "Accuracy and currency", paragraphs: ["Every article is reviewed before publication and shows its publication and last-reviewed dates. Regulations, coding guidelines, reimbursement requirements and payer policies change: verify current requirements against official sources before applying any information. Material corrections are recorded on the article."] },
      { heading: "No endorsement", paragraphs: ["References to CMS, Medicare, Medicaid, AMA, CPT, AAPC, AHIMA, HFMA, HIPAA, ISO, PMI, payers and other third parties are for educational identification and discussion only and do not imply sponsorship, partnership, endorsement, accreditation or authorisation."] },
    ],
  },
  {
    slug: "liability",
    title: "Limitation of Liability",
    summary: "How responsibility is allocated, subject to mandatory law.",
    clauses: [
      { heading: "Draft for counsel", paragraphs: ["[The wording of this policy must be prepared by qualified counsel for the operating entity and the markets served. It is intentionally left as a placeholder.]"] },
      { heading: "Rights that cannot be excluded", paragraphs: ["Nothing in RCMExcel's terms excludes or limits any liability that cannot lawfully be excluded or limited, or any mandatory consumer right under the law that applies to you."] },
      { heading: "Educational use", paragraphs: ["Educational content is general and may become outdated. RCMExcel is not responsible for decisions made by applying course or article content in live operations without verifying current official sources, payer policies, contracts and employer procedures."] },
    ],
  },
];

export const policyBySlug = (slug: string) => POLICIES.find((p) => p.slug === slug);

/** Set LEGAL_POLICIES_APPROVED=true only after counsel has signed off the final wording. */
export const policiesApproved = () => process.env.LEGAL_POLICIES_APPROVED === "true";
