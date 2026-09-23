/**
 * Transactional email.
 *
 * Resend when RESEND_API_KEY is set. Without it, mail is written to the server log with the
 * link intact so local development and CI work without a provider account — deliberately
 * loud, so nobody mistakes a dev environment for a configured one.
 */

const from = process.env.EMAIL_FROM ?? "RCMS Operations Academy <onboarding@resend.dev>";

export interface Mail {
  to: string;
  subject: string;
  text: string;
}

export async function sendMail({ to, subject, text }: Mail): Promise<void> {
  const key = process.env.RESEND_API_KEY;

  if (!key) {
    console.warn(
      [
        "",
        "─".repeat(72),
        "  EMAIL NOT SENT — RESEND_API_KEY is not set. Printing instead.",
        `  To      : ${to}`,
        `  Subject : ${subject}`,
        "",
        text.split("\n").map((l) => `  ${l}`).join("\n"),
        "─".repeat(72),
        "",
      ].join("\n"),
    );
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, text }),
  });

  if (!res.ok) {
    throw new Error(`Resend rejected the message: ${res.status} ${await res.text()}`);
  }
}
