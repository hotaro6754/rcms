"use client";

import { useRef, useState } from "react";
import { gsap, useGSAP } from "@/lib/gsap/register";
import { EASE } from "@/lib/gsap/eases";
import { introDone } from "@/lib/intro";
import { cn } from "@/lib/utils";

/**
 * THE CLAIM — the Academy's signature visual.
 *
 * The revenue cycle, told through its one real artefact: a claim, filled in as it moves.
 * Registration writes the patient line, eligibility verifies the member ID, authorisation
 * is left empty (the payer changed its code set and nobody mapped it), the service is
 * coded, the claim goes out. The payer marks it Denied · CO-50. A margin note finds the
 * cause, the authorisation is obtained and written in, the claim is resubmitted, and it
 * comes back PAID. Thirteen stages, one sheet of paper, no paragraph needed.
 *
 * It is the same case the Operations Lab and the monthly review work through further down
 * the page, so the hero sets up the story the rest of the page teaches.
 *
 * Plays once when the hero arrives, then rests on the paid claim with a replay control; it
 * does not loop for ever. Under reduced motion it renders the finished claim. All training
 * data is fictional (patient "J. Sample"); no real person or payer record is shown.
 *
 * GSAP owns the timeline inside [data-gsap-scope]. Text is real text: the finished claim
 * is fully readable without JavaScript or motion.
 */

const STAGES = [
  "Registration",
  "Eligibility",
  "Authorization",
  "Service",
  "Coding",
  "Claim submitted",
  "Payer adjudication",
  "Denied",
  "Root cause",
  "Corrected",
  "Resubmitted",
  "Paid",
  "Reconciled",
];

export function ClaimDocument({ className }: { className?: string }) {
  const root = useRef<HTMLDivElement>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const [ended, setEnded] = useState(false);

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const q = gsap.utils.selector(el);
        const stageNo = el.querySelector<HTMLElement>(".cd-stage-no");
        const stageName = el.querySelector<HTMLElement>(".cd-stage-name");
        const bar = el.querySelector<HTMLElement>(".cd-bar");
        const status = el.querySelector<HTMLElement>(".cd-status");

        const stage = (i: number, statusText?: string) => () => {
          if (stageNo) stageNo.textContent = String(i + 1).padStart(2, "0");
          if (stageName) stageName.textContent = STAGES[i];
          if (bar) bar.style.transform = `scaleX(${(i + 1) / STAGES.length})`;
          if (status && statusText) status.textContent = statusText;
        };
        const type = { clipPath: "inset(0 0% 0 0)", duration: 0.55, ease: "power1.inOut" };
        const note = { autoAlpha: 1, x: 0, duration: 0.45, ease: EASE.exec };
        const badgeIn = [{ autoAlpha: 0, y: 4 }, { autoAlpha: 1, y: 0, duration: 0.3 }] as const;

        // Blank claim.
        gsap.set(q(".cd-value"), { clipPath: "inset(0 100% 0 0)" });
        gsap.set(q(".cd-note"), { autoAlpha: 0, x: 8 });
        gsap.set(q(".cd-badge"), { autoAlpha: 0 });
        gsap.set(q(".cd-auth-fixed"), { clipPath: "inset(0 100% 0 0)" });
        gsap.set(q(".cd-highlight"), { scaleX: 0, transformOrigin: "left center" });
        gsap.set(q(".cd-flag"), { scaleX: 0, transformOrigin: "left center" });
        gsap.set(q(".cd-meta"), { autoAlpha: 0 });
        // The resting markup is the finished claim; rewind the parts that change.
        gsap.set(q(".cd-v-auth"), { autoAlpha: 1 });

        const tl = gsap.timeline({
          paused: true,
          defaults: { ease: EASE.exec },
          onStart: () => setEnded(false),
          onComplete: () => setEnded(true),
        });
        tlRef.current = tl;
        const step = 0.72;
        let t = 0.2;

        tl.to(q(".cd-meta"), { autoAlpha: 1, duration: 0.4 }, 0)
          // 01 Registration
          .call(stage(0, "Draft"), undefined, t)
          .to(q(".cd-v-patient"), type, t)
          // 02 Eligibility
          .call(stage(1), undefined, (t += step))
          .to(q(".cd-v-member"), type, t)
          .to(q(".cd-n-elig"), note, t + 0.35)
          // 03 Authorization: nothing on file
          .call(stage(2), undefined, (t += step))
          .to(q(".cd-v-auth"), type, t)
          .to(q(".cd-n-auth-risk"), note, t + 0.35)
          // 04 Service
          .call(stage(3), undefined, (t += step))
          .to(q(".cd-v-service"), type, t)
          // 05 Coding
          .call(stage(4), undefined, (t += step))
          .to(q(".cd-v-codes"), type, t)
          .to(q(".cd-n-codes"), note, t + 0.35)
          .to(q(".cd-v-charges"), type, t + 0.3)
          // 06 Submitted
          .call(stage(5, "Submitted · 837 sent to the payer"), undefined, (t += step))
          // 07 Payer
          .call(stage(6, "Adjudicating…"), undefined, (t += step))
          // 08 Denied
          .call(stage(7, "Denied · 835 received"), undefined, (t += step))
          .fromTo(q(".cd-badge-denied"), ...badgeIn, t)
          .to(q(".cd-flag"), { scaleX: 1, duration: 0.4 }, t + 0.3)
          .to(q(".cd-n-auth-risk"), { autoAlpha: 0, duration: 0.2 }, t + 0.3)
          .to(q(".cd-n-denied"), note, t + 0.45)
          // 09 Root cause
          .call(stage(8), undefined, (t += step + 0.6))
          .to(q(".cd-n-denied"), { autoAlpha: 0, duration: 0.2 }, t)
          .to(q(".cd-n-cause"), note, t + 0.15)
          // 10 Corrected
          .call(stage(9, "Corrected"), undefined, (t += step + 0.4))
          .to(q(".cd-v-auth"), { autoAlpha: 0, duration: 0.2 }, t)
          .to(q(".cd-highlight"), { scaleX: 1, duration: 0.45 }, t + 0.1)
          .to(q(".cd-auth-fixed"), { clipPath: "inset(0 0% 0 0)", duration: 0.55, ease: "power1.inOut" }, t + 0.2)
          .to(q(".cd-flag"), { scaleX: 0, transformOrigin: "right center", duration: 0.3 }, t + 0.2)
          .to(q(".cd-n-cause"), { autoAlpha: 0, duration: 0.2 }, t + 0.1)
          .to(q(".cd-n-fixed"), note, t + 0.35)
          // 11 Resubmitted
          .call(stage(10, "Resubmitted · corrected claim"), undefined, (t += step))
          .to(q(".cd-badge-denied"), { autoAlpha: 0, duration: 0.25 }, t)
          // 12 Paid
          .call(stage(11, "Paid · $986.40 · 835 received"), undefined, (t += step))
          .fromTo(q(".cd-badge-paid"), ...badgeIn, t)
          // 13 Reconciled
          .call(stage(12, "Posted and reconciled. Cycle closed."), undefined, (t += step));

        let alive = true;
        introDone().then(() => {
          if (alive) tl.play(0);
        });
        return () => {
          alive = false;
          tl.kill();
          tlRef.current = null;
        };
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <div ref={root} data-gsap-scope className={cn("relative", className)}>
      {/* Stage readout: where in the cycle this claim is. */}
      <div className="cd-meta mb-3 flex items-center gap-4 sm:mr-[10.5rem]">
        <span className="text-data text-micro text-brand">
          <span className="cd-stage-no">13</span> / {STAGES.length}
        </span>
        <span className="relative h-px flex-1 overflow-hidden bg-input">
          <span className="cd-bar absolute inset-0 origin-left bg-brand transition-transform duration-[var(--dur-med)]" />
        </span>
        <span className="cd-stage-name label-caps text-[12px]">Reconciled</span>
      </div>

      {/* The claim. Margin notes live inside their row, so each one sits beside its line. */}
      <div className="sm:mr-[10.5rem]">
        <div className="cd-paper env-paper relative rounded-[10px] border border-border bg-[var(--paper)] shadow-[var(--shadow-card-hover)]">

          <header className="relative flex items-start justify-between gap-4 border-b border-border px-5 pb-3 pt-4">
            <div>
              <p className="text-data text-[11.5px] tracking-[0.14em] text-muted-foreground">HEALTH INSURANCE CLAIM</p>
              <p className="mt-1 text-[1.35rem] font-bold leading-none tracking-[-0.015em]">Claim #20481</p>
            </div>
            <p className="text-data text-right text-[11.5px] leading-relaxed tracking-[0.06em] text-muted-foreground">
              FORM 837P
              <br />
              TRAINING RECORD
            </p>
          </header>

          <dl className="relative">
            <Field label="Patient">
              <span className="cd-value cd-v-patient">J. Sample · DOB 04/17/1968</span>
            </Field>
            <Field
              label="Member ID"
              notes={
                <Note className="cd-n-elig" tone="good">
                  Coverage verified with the payer.
                </Note>
              }
            >
              <span className="cd-value cd-v-member">AET-88210-44 · Commercial PPO</span>
            </Field>
            <Field
              label="Prior auth."
              danger
              notes={
                <>
                  <Note className="cd-n-auth-risk" tone="quiet" hidden>
                    Rule still on last quarter&rsquo;s codes.
                  </Note>
                  <Note className="cd-n-denied" tone="danger" hidden>
                    Denied: missing authorisation.
                  </Note>
                  <Note className="cd-n-cause" tone="danger" hidden>
                    Why? Payer changed its policy on 01 Aug. Never mapped.
                  </Note>
                  <Note className="cd-n-fixed" tone="good">
                    Authorisation obtained, rule updated.
                  </Note>
                </>
              }
            >
              <span className="relative inline-block">
                <span className="cd-flag absolute -bottom-0.5 left-0 right-0 h-[2px] scale-x-0 bg-danger" aria-hidden="true" />
                <span className="cd-value cd-v-auth text-subtle opacity-0">None on file</span>
                <span className="cd-highlight absolute -inset-x-1 inset-y-0 -z-0 rounded-[2px] bg-accent" aria-hidden="true" />
                <span className="cd-auth-fixed absolute left-0 top-0 whitespace-nowrap font-medium text-accent-foreground">
                  PA-2026-0831
                </span>
              </span>
            </Field>
            <Field label="Service">
              <span className="cd-value cd-v-service">08/12/2026 · Cardiology, outpatient</span>
            </Field>
            <Field
              label="Codes"
              notes={
                <Note className="cd-n-codes" tone="quiet">
                  Myocardial perfusion imaging.
                </Note>
              }
            >
              <span className="cd-value cd-v-codes">CPT 78452 · ICD-10 R07.9</span>
            </Field>
            <Field label="Charges" last>
              <span className="cd-value cd-v-charges">$1,240.00</span>
            </Field>
          </dl>

          <footer className="relative flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-border px-5 py-3">
            <span className="flex min-w-0 flex-1 items-center gap-2">
              <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
              <span className="cd-status text-[12px] text-muted-foreground">Posted and reconciled. Cycle closed.</span>
            </span>
            {/* The payer's decision, as a status badge: denied first, then paid after the correction. */}
            <span className="relative inline-grid text-[12px] font-semibold">
              <span className="cd-badge cd-badge-denied invisible col-start-1 row-start-1 rounded-full bg-danger-bg px-2.5 py-1 text-danger">
                Denied · CO-50 · RARC N706
              </span>
              <span className="cd-badge cd-badge-paid col-start-1 row-start-1 justify-self-end rounded-full bg-accent px-2.5 py-1 text-accent-foreground">
                Paid · $986.40 · 835
              </span>
            </span>
          </footer>
        </div>
      </div>

      <div className="mt-3 flex h-7 items-center justify-end sm:mr-[10.5rem]">
        <button
          type="button"
          onClick={() => tlRef.current?.restart()}
          className={cn(
            "inline-flex items-center gap-1.5 text-micro font-medium text-muted-foreground transition-opacity duration-[var(--dur-med)] hover:text-foreground",
            ended ? "opacity-100" : "pointer-events-none opacity-0",
          )}
          aria-hidden={!ended}
          tabIndex={ended ? 0 : -1}
        >
          <span aria-hidden="true">↺</span> Watch the claim again
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  notes,
  last,
  danger,
}: {
  label: string;
  children: React.ReactNode;
  /** Margin notes for this line: beside the paper on wide screens, under the line on phones. */
  notes?: React.ReactNode;
  last?: boolean;
  danger?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative grid grid-cols-[6rem_minmax(0,1fr)] items-baseline gap-3 px-5 py-[0.62rem]",
        !last && "border-b border-dashed border-foreground/12",
      )}
    >
      <dt className={cn("text-data text-[11.5px] uppercase tracking-[0.1em]", danger ? "text-muted-foreground" : "text-subtle")}>{label}</dt>
      <dd className="text-data relative truncate text-[13.5px] text-foreground">{children}</dd>
      {notes && (
        <dd className="relative col-span-2 min-h-[2.5em] sm:absolute sm:left-[calc(100%+1.25rem)] sm:top-[0.45rem] sm:min-h-0 sm:w-[9.25rem]">
          {notes}
        </dd>
      )}
    </div>
  );
}

function Note({
  children,
  className,
  tone = "quiet",
  hidden,
}: {
  children?: React.ReactNode;
  className?: string;
  tone?: "good" | "danger" | "quiet";
  /** Hidden in the resting (finished) state; only shown mid-sequence. */
  hidden?: boolean;
}) {
  if (!children) return null;
  return (
    <p
      className={cn(
        "cd-note absolute inset-x-0 top-0 flex gap-2 text-[13px] font-medium leading-snug",
        tone === "good" ? "text-brand" : tone === "danger" ? "text-danger" : "text-muted-foreground",
        hidden && "invisible",
        className,
      )}
    >
      <span aria-hidden="true" className="mt-[0.6em] h-px w-3 shrink-0 bg-current opacity-60" />
      <span>{children}</span>
    </p>
  );
}
