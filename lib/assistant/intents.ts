/**
 * Deterministic intent detection. Questions about the learner's own records are answered from
 * the platform's data, never by a language model; requests for a person go straight to the
 * support hand-off. Everything else is a knowledge question.
 */

export type LearnerIntent = "human" | "ticket" | "my_progress" | "my_certificates" | "my_tickets" | "explain_lesson" | "knowledge";

const has = (q: string, re: RegExp) => re.test(q);

export function learnerIntent(question: string, hasLessonContext: boolean): LearnerIntent {
  const q = question.toLowerCase();
  if (has(q, /\b(talk|speak|chat) (to|with) (a |an |)(human|person|someone|agent|real person|staff)\b|\b(human|real person) please\b|^\s*(human|agent|person)\s*\??$/)) return "human";
  if (has(q, /\b(raise|open|create|log|file|submit)\b.{0,20}\b(ticket|case|complaint|support request)\b|\breport (a |an )?(bug|problem|issue)\b/)) return "ticket";
  if (has(q, /\bmy (support )?(tickets?|cases?|requests?)\b|\bstatus of my\b/)) return "my_tickets";
  if (has(q, /\bmy progress\b|\bwhat (do|should) i (need|have) to (do|complete|finish)\b|\b(left|remaining) to (do|complete|finish)\b|\bbefore (the |my |i get )?(the )?certificat|\b(incomplete|not complete|locked)\b|\bnext lesson\b|\bwhere (was|am) i\b/))
    return "my_progress";
  if (has(q, /\bmy certificates?\b|\b(download|where|get|find)\b.{0,30}\bcertificates?\b/)) return "my_certificates";
  if (hasLessonContext && has(q, /\b(explain|simpler|simplify|summari[sz]e|summary|eli5|plain (english|terms)|this lesson|this module)\b/)) return "explain_lesson";
  return "knowledge";
}

export type StaffCommand =
  | { kind: "help" }
  | { kind: "high_priority_tickets"; team: boolean }
  | { kind: "awaiting_review" }
  | { kind: "duplicate_titles" }
  | { kind: "missing_criteria" }
  | { kind: "support_hotspots" }
  | { kind: "competency_gaps" }
  | { kind: "not_completed_module"; course: string; module: number }
  | { kind: "summarize_ticket"; reference: string }
  | { kind: "draft_reply"; reference: string }
  | { kind: "assign_to_me"; reference: string }
  | { kind: "knowledge" };

const WORD_NUM: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, first: 1, second: 2, third: 3, fourth: 4, fifth: 5 };

export function staffCommand(question: string): StaffCommand {
  const q = question.toLowerCase().trim();
  const ref = question.match(/\bSUP-\d{4}-\d{3,}\b/i)?.[0]?.toUpperCase();
  if (/^(help|what can you do\??|commands)$/.test(q)) return { kind: "help" };
  if (ref && /\bassign\b.{0,30}\b(me|myself)\b|\btake\b/.test(q)) return { kind: "assign_to_me", reference: ref };
  if (ref && /\b(summari[sz]e|summary)\b/.test(q)) return { kind: "summarize_ticket", reference: ref };
  if (ref && /\b(draft|reply|response|respond)\b/.test(q)) return { kind: "draft_reply", reference: ref };
  if (/\b(high|urgent)[- ]priority\b.{0,40}\b(tickets?|cases?)\b|\b(tickets?|cases?)\b.{0,40}\b(high|urgent)\b/.test(q)) return { kind: "high_priority_tickets", team: /\bmy team\b|\bteam\b/.test(q) };
  if (/\b(awaiting|waiting for|in) review\b|\bunpublished\b/.test(q)) return { kind: "awaiting_review" };
  if (/\bduplicate\b.{0,20}\b(titles?|courses?|names?)\b/.test(q)) return { kind: "duplicate_titles" };
  if (/\bmissing\b.{0,40}\b(prerequisites?|completion|criteria|outcomes|assessments?)\b/.test(q)) return { kind: "missing_criteria" };
  if (/\b(most|top)\b.{0,30}\b(support|tickets?|requests?)\b/.test(q)) return { kind: "support_hotspots" };
  if (/\bcompetency gaps?\b|\b(recurring|common)\b.{0,20}\bgaps?\b/.test(q)) return { kind: "competency_gaps" };
  const m = q.match(/\b(?:not|haven'?t|have not)\b.{0,20}\bcomplet\w*\b.{0,10}\bmodule\s+(\d+|\w+)\b/) ?? q.match(/\bmodule\s+(\d+|\w+)\b.{0,30}\bnot\b.{0,10}\bcomplet/);
  const course = question.match(/\b(?:in|enrolled in|for)\s+["“]?([^"”?]+?)["”]?\s+(?:who|that|and|course)\b/i)?.[1];
  if (m && course) {
    const n = Number(m[1]) || WORD_NUM[m[1]] || 0;
    if (n > 0) return { kind: "not_completed_module", course: course.trim(), module: n };
  }
  return { kind: "knowledge" };
}
