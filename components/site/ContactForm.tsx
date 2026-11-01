"use client";

import { useRef, useState, useTransition } from "react";
import { motion } from "motion/react";
import { Check, Loader2 } from "lucide-react";
import { submitContact } from "@/lib/actions/leads";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import type { PageContent } from "@/lib/site/fields";
import type { contactPage } from "@/lib/site/pages/contact";

export type ContactFormCopy = PageContent<typeof contactPage>["form"];

const inr = (paise: number) => "₹" + Math.round(paise / 100).toLocaleString("en-IN");

interface Options {
  courses: { name: string; amount: number }[];
  mentoring: { name: string; amount: number }[];
}

/** Interest options come from active products, so the prices shown match checkout. */
export function ContactForm({ options, defaultInterest = "", copy }: { options: Options; defaultInterest?: string; copy: ContactFormCopy }) {
  const known = [...options.courses, ...options.mentoring].some((o) => o.name === defaultInterest) || defaultInterest === "Corporate account";
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
        className="site-card p-8"
      >
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-success-bg text-success">
          <Check className="h-5 w-5" aria-hidden />
        </span>
        <h2 className="mt-5 text-[1.4rem] leading-tight">{copy.successTitle}</h2>
        <p className="mt-3 max-w-[52ch] text-[13.5px] leading-relaxed text-muted-foreground">
          {copy.successBody}
        </p>
        <button
          type="button"
          onClick={() => setSent(false)}
          className="mt-5 text-micro font-medium text-primary hover:underline"
        >
          {copy.again}
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
      className="site-card p-6"
    >
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label htmlFor="name" className="text-[13px] font-medium">{copy.nameLabel}</label>
          <Input id="name" name="name" autoComplete="name" required className="min-h-11"
            aria-invalid={field === "name"} />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="email" className="text-[13px] font-medium">{copy.emailLabel}</label>
          <Input id="email" name="email" type="email" autoComplete="email" required
            className="min-h-11" aria-invalid={field === "email"} />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="role" className="text-[13px] font-medium">{copy.roleLabel}</label>
          <Input id="role" name="role" placeholder={copy.rolePlaceholder || undefined}
            className="min-h-11 placeholder:text-subtle" />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="interest" className="text-[13px] font-medium">{copy.interestLabel}</label>
          <select
            id="interest"
            name="interest"
            defaultValue={known ? defaultInterest : ""}
            className="min-h-11 rounded-md border border-input bg-background px-3 text-[14px] outline-none transition-colors focus:border-primary"
          >
            <option value="" disabled>{copy.interestPrompt}</option>
            {options.courses.length > 0 && (
              <optgroup label={copy.coursesGroup}>
                {options.courses.map((p) => (
                  <option key={p.name} value={p.name}>{p.name} · {inr(p.amount)}</option>
                ))}
              </optgroup>
            )}
            {options.mentoring.length > 0 && (
              <optgroup label={copy.mentoringGroup}>
                {options.mentoring.map((m) => (
                  <option key={m.name} value={m.name}>{m.name} · {inr(m.amount)}</option>
                ))}
              </optgroup>
            )}
            <option value="Corporate account">{copy.corporateOption}</option>
            <option value="Something else">{copy.otherOption}</option>
          </select>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-2">
        <label htmlFor="message" className="text-[13px] font-medium">
          {copy.messageLabel}
        </label>
        <Textarea
          id="message"
          name="message"
          rows={5}
          required
          aria-invalid={field === "message"}
          placeholder={copy.messagePlaceholder || undefined}
          className="placeholder:text-subtle"
        />
      </div>

      <p className="mt-4 text-micro leading-relaxed text-muted-foreground">
        {copy.privacy}
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

      <Button type="submit" disabled={pending} className="mt-6 min-h-11 rounded-md">
        {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
        {copy.submit}
      </Button>
    </form>
  );
}
