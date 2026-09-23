"use client";

import { useRef, useState, useTransition } from "react";
import { motion } from "motion/react";
import { Check, Loader2 } from "lucide-react";
import { submitContact } from "@/lib/actions/leads";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { MENTORING, PROGRAMS, inr } from "@/lib/data/catalog";

export function ContactForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, start] = useTransition();
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [field, setField] = useState<string | null>(null);

  if (sent) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.24 }}
        className="rounded-[var(--radius)] border border-border bg-card p-8"
      >
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-success-bg text-success">
          <Check className="h-5 w-5" aria-hidden />
        </span>
        <h2 className="mt-5 text-[1.4rem] leading-tight">That is with me</h2>
        <p className="mt-3 max-w-[52ch] text-[13.5px] leading-relaxed text-muted-foreground">
          You will get a reply within one working day, IST. If it is urgent, WhatsApp is
          faster than email.
        </p>
        <button
          type="button"
          onClick={() => setSent(false)}
          className="mt-5 text-micro font-medium text-primary hover:underline"
        >
          Send another
        </button>
      </motion.div>
    );
  }

  return (
    <form
      ref={formRef}
      action={(formData) =>
        start(async () => {
          setError(null);
          setField(null);
          const res = await submitContact(formData);
          if (res.ok) {
            setSent(true);
            formRef.current?.reset();
          } else {
            setError(res.error);
            setField(res.field ?? null);
          }
        })
      }
      className="rounded-[var(--radius)] border border-border bg-card p-6"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label htmlFor="name" className="text-[13px] font-medium">Name</label>
          <Input id="name" name="name" autoComplete="name" required className="min-h-11"
            aria-invalid={field === "name"} />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="email" className="text-[13px] font-medium">Email</label>
          <Input id="email" name="email" type="email" autoComplete="email" required
            className="min-h-11" aria-invalid={field === "email"} />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="role" className="text-[13px] font-medium">Current role</label>
          <Input id="role" name="role" placeholder="AR analyst, team lead, manager…"
            className="min-h-11 placeholder:text-subtle" />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="interest" className="text-[13px] font-medium">Interested in</label>
          <select
            id="interest"
            name="interest"
            defaultValue=""
            className="min-h-11 rounded-md border border-input bg-background px-3 text-[14px] outline-none transition-colors focus:border-primary"
          >
            <option value="" disabled>Choose one</option>
            <optgroup label="Programs">
              {PROGRAMS.map((p) => (
                <option key={p.id} value={p.name}>{p.name} · {inr(p.price)}</option>
              ))}
            </optgroup>
            <optgroup label="Mentoring">
              {MENTORING.map((m) => (
                <option key={m.id} value={m.name}>{m.name} · {inr(m.price)}</option>
              ))}
            </optgroup>
            <option value="Corporate cohort">Corporate cohort</option>
          </select>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-2">
        <label htmlFor="message" className="text-[13px] font-medium">
          What are you trying to move?
        </label>
        <Textarea
          id="message"
          name="message"
          rows={5}
          required
          aria-invalid={field === "message"}
          placeholder="The metric, the role, or the problem on your floor."
          className="placeholder:text-subtle"
        />
      </div>

      <p className="mt-4 text-micro leading-relaxed text-muted-foreground">
        Never send PHI, real patient identifiers or client documents you are not authorised
        to share. Anonymise anything operational before it leaves your building.
      </p>

      {error && (
        <motion.p
          role="alert"
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18 }}
          className="mt-4 rounded-md border border-danger/30 bg-danger-bg px-3 py-2.5 text-micro leading-relaxed text-danger"
        >
          {error}
        </motion.p>
      )}

      <Button type="submit" disabled={pending} className="mt-6 min-h-11 rounded-full">
        {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
        Send
      </Button>
    </form>
  );
}
