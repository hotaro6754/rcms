import type { Passage } from "./search";

/**
 * Platform help: how this academy works, written from the application's actual behaviour.
 * These are the assistant's authorised platform documentation alongside approved course and
 * library content. Keep them in step with the code they describe.
 */
export const HELP: Passage[] = [
  {
    id: "help:certificate",
    kind: "help",
    title: "Getting and downloading your certificate",
    href: "/certificates",
    text: "A course certificate becomes available when you have completed every lesson in the released course and passed every assessment in it. Open the course and choose Claim certificate. Your certificates are listed under Certificates; each has a public verification page and a Download PDF link. Revoked certificates are marked as revoked. Certificates show course completion with this academy; they are not an external accreditation.",
  },
  {
    id: "help:assessment-incomplete",
    kind: "help",
    title: "Why an assessment can show as incomplete or not passed",
    href: "/academy",
    text: "An assessment is complete when an attempt is graded and reaches the passing score. Written answers and uploaded assignments are marked by an instructor, so the attempt stays submitted until a person grades it. Some assessments limit attempts or make you wait before a retake. A lesson with an assessment is marked complete only when you pass it.",
  },
  {
    id: "help:locked",
    kind: "help",
    title: "Why a module or course is locked",
    href: "/academy",
    text: "A module can require an earlier module to be finished first; it opens once every lesson of that earlier module is complete. A course can require the certificate of another course before you can enrol or buy it.",
  },
  {
    id: "help:account",
    kind: "help",
    title: "Updating your account, password and two-step verification",
    href: "/account",
    text: "Open Account to change your name, password and two-step verification, see your sessions, and request a copy, correction or deletion of your data. Sensitive changes ask you to sign in again if your last sign-in was more than 15 minutes ago. You can also close your account there.",
  },
  {
    id: "help:support",
    kind: "help",
    title: "Contacting a person in support",
    href: "/support/new",
    text: "Start a conversation under Support. Choose a topic so it reaches the right team; you get a case number straight away and a notification when someone replies. If a case is resolved but the problem continues, reply within 14 days and it reopens. Never include patient information, member numbers or card details.",
  },
  {
    id: "help:case-practice",
    kind: "help",
    title: "How case practice is scored",
    href: "/cases",
    text: "Each case practice simulation is a synthetic denied claim. You choose the issue, the evidence you relied on, the rule, the next action and whether to escalate, then write a rationale and an account note. The server scores it against the published rubric. Some mistakes are critical and fail the attempt whatever the total. The expected decision is shown once you pass or after your second attempt. Answers save automatically, and you can ask an instructor to review a scored attempt.",
  },
  {
    id: "help:competency",
    kind: "help",
    title: "What competencies mean here",
    href: "/cases",
    text: "A competency is demonstrated only through a scored case attempt: you pass the case with no critical error and meet the competency's threshold on the rubric criteria that evidence it. Finishing lessons alone does not demonstrate a competency. Some competencies ask for reassessment after a period.",
  },
  {
    id: "help:bookmarks",
    kind: "help",
    title: "Saving lessons for later",
    href: "/academy",
    text: "Use Save on a lesson to bookmark it. Saved lessons are listed on My academy.",
  },
  {
    id: "help:payments",
    kind: "help",
    title: "Payments, subscriptions and refunds",
    href: "/support/new?category=SUBSCRIPTION",
    text: "Plans and courses are paid through the checkout. Access is granted when the payment provider confirms the payment, not when the browser returns. Subscriptions are prepaid and do not renew automatically. Refund requests are reviewed by the finance team; contact support with your order number.",
  },
];
