"use client";

// The variant without external font loading (the site's security policy allows no third-party CSS).
import "@puckeditor/core/no-external.css";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Puck, useGetPuck, type Data } from "@puckeditor/core";
import type { Design } from "@/lib/design/schema";
import { designConfig } from "./puck-config";
import type { MediaOption } from "./fields";

type SaveResult = { ok: true; data?: unknown } | { ok: false; error: string };

/**
 * The full-screen visual designer. Drag components from the left, arrange them on the page,
 * change their settings on the right. "Save" sends the design to the server, which checks it
 * before storing (lib/design/schema.ts); nothing goes live from here on its own.
 */
export function Designer({
  title,
  initial,
  media,
  mediaQuery,
  backHref,
  backLabel,
  save,
}: {
  title: string;
  initial: Design;
  media: MediaOption[];
  /** Appended to /api/media/<id> (e.g. ?c=<courseId>) so private course images load. */
  mediaQuery: string;
  backHref: string;
  backLabel: string;
  save: (design: unknown) => Promise<SaveResult>;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [dirty, setDirty] = useState(false);
  // Puck injects its own styles (which load a font from a third-party site, refused by the
  // site's security policy) unless its stylesheet is already in the page when it first renders.
  // On in-app navigation the stylesheet can arrive a moment later, so wait for it.
  const [cssReady, setCssReady] = useState(false);
  useEffect(() => {
    let tries = 0;
    const check = () => {
      if (
        getComputedStyle(document.documentElement)
          .getPropertyValue("--_puck-styles-loaded")
          .trim() !== "" ||
        ++tries > 100
      )
        setCssReady(true);
      else timer = window.setTimeout(check, 30);
    };
    let timer = window.setTimeout(check, 0);
    return () => window.clearTimeout(timer);
  }, []);
  const config = useMemo(
    () =>
      designConfig({
        media,
        ctx: { mediaUrl: (id) => `/api/media/${id}${mediaQuery}` },
      }),
    [media, mediaQuery],
  );

  const doSave = (data: Data) =>
    start(async () => {
      setMsg(null);
      const r = await save(data);
      if (!r.ok) return setMsg({ ok: false, text: r.error });
      setDirty(false);
      setMsg({ ok: true, text: "Saved." });
      router.refresh();
    });

  return (
    // Covers the admin header: the designer needs the whole window.
    <div className="fixed inset-0 z-[100] bg-white">
      {!cssReady ? (
        <p className="p-6 text-[13px] text-[#555]">Opening the designer…</p>
      ) : (
        <Puck
          config={config}
          data={initial as unknown as Data}
          headerTitle={title}
          onChange={() => setDirty(true)}
          onPublish={doSave}
          iframe={{ enabled: false }}
          overrides={{
            headerActions: () => (
              <HeaderActions
                msg={msg}
                pending={pending}
                dirty={dirty}
                backHref={backHref}
                backLabel={backLabel}
                onSave={doSave}
              />
            ),
          }}
        />
      )}
    </div>
  );
}

function HeaderActions({
  msg,
  pending,
  dirty,
  backHref,
  backLabel,
  onSave,
}: {
  msg: { ok: boolean; text: string } | null;
  pending: boolean;
  dirty: boolean;
  backHref: string;
  backLabel: string;
  onSave: (data: Data) => void;
}) {
  const getPuck = useGetPuck();
  return (
    <div className="flex items-center gap-3">
      {msg && (
        <span
          role={msg.ok ? "status" : "alert"}
          className={`max-w-[28rem] text-[12.5px] ${msg.ok ? "text-green-800" : "text-red-700"}`}
        >
          {msg.text}
        </span>
      )}
      <a
        href={backHref}
        onClick={(e) => {
          if (dirty && !window.confirm("Leave without saving your changes?"))
            e.preventDefault();
        }}
        className="text-[13px] underline underline-offset-4"
      >
        {backLabel}
      </a>
      <button
        type="button"
        disabled={pending}
        onClick={() => onSave(getPuck().appState.data)}
        className="rounded bg-[#161513] px-4 py-2 text-[13px] font-medium text-white disabled:opacity-50"
      >
        {pending ? "Saving…" : dirty ? "Save" : "Saved"}
      </button>
    </div>
  );
}
