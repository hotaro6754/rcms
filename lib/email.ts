import nodemailer from "nodemailer";
import { BRAND } from "@/lib/brand";
/**
 * Transactional email.
 *
 * Sent through an SMTP mailbox when SMTP_HOST is set (for example Hostinger's mail server with
 * the no-reply@ mailbox), otherwise through Resend when RESEND_API_KEY is set. Without either,
 * mail is written to the server log with the link intact so local development and CI work
 * without a provider account — deliberately loud, so nobody mistakes a dev environment for a
 * configured one.
 */

const from = process.env.EMAIL_FROM ?? `${BRAND.name} <onboarding@resend.dev>`;

export interface Mail {
  to: string;
  subject: string;
  text: string;
}

let transport: nodemailer.Transporter | null = null;
function smtp() {
  if (!process.env.SMTP_HOST) return null;
  const port = Number(process.env.SMTP_PORT ?? 465);
  transport ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    // 465 is TLS from the start; 587 upgrades with STARTTLS.
    secure: port === 465,
    auth: { user: process.env.SMTP_USER ?? "", pass: process.env.SMTP_PASSWORD ?? "" },
  });
  return transport;
}

export async function sendMail({ to, subject, text }: Mail): Promise<void> {
  const viaSmtp = smtp();
  if (viaSmtp) {
    await viaSmtp.sendMail({ from, to, subject, text });
    return;
  }

  const key = process.env.RESEND_API_KEY;

  if (!key) {
    // Message bodies carry sign-in, verification and reset links, which are credentials, so
    // they are printed only in local development, never in a deployed environment's logs.
    if (process.env.NODE_ENV === "production") {
      console.error("EMAIL NOT SENT: neither SMTP_HOST nor RESEND_API_KEY is set. Configure email delivery.");
      return;
    }
    console.warn(
      [
        "",
        "─".repeat(72),
        "  EMAIL NOT SENT — no SMTP_HOST or RESEND_API_KEY. Printing instead.",
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
