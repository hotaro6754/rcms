import { legalPage } from "./legal";

// Default copy, written to match what the platform actually does. Have it reviewed by a lawyer
// before launch; the Super Administrator can then edit it in the website editor.
export const legalPrivacyPage = legalPage({
  key: "legal-privacy",
  path: "/legal/privacy",
  label: "Privacy policy",
  eyebrow: "Legal",
  title: "Privacy policy",
  lead: "What is collected, why, who else handles it, how long it is kept, and what you can ask to have removed.",
  updated: "20 October 2026",
  clauses: [
    {
      h: "What is collected",
      p: [
        "Account details you provide: name, email address, phone number where you supply one, and the role and experience level you enter when enrolling or booking mentoring.",
        "Learning records: the courses you are enrolled in, lessons opened and completed, quiz and assessment answers and scores, case-simulation work and the feedback on it, and certificates issued to you.",
        "Support and assistant records: support cases you raise and the messages in them, and questions you ask the learning assistant.",
        "Sign-in and security records: when you signed in, the IP address and browser used, failed sign-in attempts (to lock an account under attack), and an audit trail of changes made by staff.",
        "Payment records: what you bought, the amount, the invoice, and the confirmation from the payment processor.",
      ],
    },
    {
      h: "What is never collected",
      p: [
        "Protected health information. Do not send patient names, member identifiers, dates of birth, account numbers or claim numbers from live systems, in a form, an email, a support case, a mentoring attachment or a community post. Every case and exercise on this site uses made-up data.",
        "Client documents you are not authorised to share. Anonymise anything operational before it leaves your employer's building.",
        "Anything submitted in breach of the above is deleted on discovery and the sender is told.",
      ],
    },
    {
      h: "Why it is collected",
      p: [
        "To give you access to what you purchased, track your progress, grade your work, issue certificates, raise invoices, answer support questions and keep accounts secure.",
        "Aggregate usage informs curriculum changes. It is never sold, rented or shared with advertisers, and there is no advertising or third-party tracking on this site.",
      ],
    },
    {
      h: "Certificates",
      p: [
        "A certificate shows your name, the program and the date it was issued. Anyone with its serial number or link can open it to check it is genuine; that is its purpose. Certificate pages are not listed in search engines, and an unknown serial reveals nothing.",
      ],
    },
    {
      h: "Who else handles your data",
      p: [
        "The hosting provider that runs the site, its database and its file storage.",
        "The email provider that delivers account, receipt and course emails.",
        "The payment processor, which receives your payment details directly. Card and bank details are never stored on this site and never pass through it in a readable form; this site receives only the confirmation, the amount and the last four digits of the instrument.",
        "The learning assistant answers from approved course material on this site. It does not send your questions to an outside AI provider unless that is switched on, and if it is, only the question (with personal details masked) and course passages are sent, never your account records. This policy will be updated before that happens.",
        "Each provider handles data under its own terms and only to provide its service. Some of them may process data outside India.",
      ],
    },
    {
      h: "Cookies",
      p: [
        "Cookies that keep you signed in and carry you through two-step verification. Staff who preview unpublished website changes get one more cookie for that. These are needed for the site to work.",
        "There are no analytics, advertising or tracking cookies.",
      ],
    },
    {
      h: "Course material",
      p: [
        "Course material is licensed to your account for reading on this site. Copying, printing and downloading are restricted inside lessons, and documents are shown page by page rather than sent as files.",
      ],
    },
    {
      h: "How long data is kept",
      p: [
        "Account, learning and purchase records are kept for as long as the account exists, and purchase records for the period required by Indian tax and accounting rules after it closes.",
        "Learning assistant conversations are deleted 90 days after they were last used.",
        "Support case messages are deleted two years after the case is closed.",
        "Mentoring notes and any artefact you send are deleted within 90 days of the session unless you ask for them to be retained.",
        "Backups are kept for a limited period and then overwritten.",
      ],
    },
    {
      h: "Security",
      p: [
        "Passwords are stored only as one-way hashes. Connections to the site are encrypted. Staff access is limited by role, staff must use two-step verification, and sensitive changes need a second person to approve them. No system is perfectly secure; if a breach affects your data you will be told.",
      ],
    },
    {
      h: "Your rights",
      p: [
        "You can ask for a copy of what is held about you, ask for corrections, or ask for deletion. Deletion removes account access; purchase records required for tax compliance are retained.",
        "Requests go to the contact address on the contact page and are answered within 30 days.",
      ],
    },
    {
      h: "Changes",
      p: ["Material changes to this policy are notified by email to registered accounts before they take effect."],
    },
  ],
});
