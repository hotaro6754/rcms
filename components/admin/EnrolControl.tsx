"use client";

import { useState, useTransition } from "react";
import { grantEnrolment } from "@/lib/actions/academy";
import { Button } from "@/components/ui/button";

export function EnrolControl({
  userId,
  programs,
}: {
  userId: string;
  programs: { id: string; name: string }[];
}) {
  const [programId, setProgramId] = useState(programs[0]?.id ?? "");
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  if (programs.length === 0) {
    return <span className="text-micro text-muted-foreground">Enrolled on everything</span>;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        aria-label="Program to grant"
        value={programId}
        onChange={(e) => setProgramId(e.target.value)}
        className="min-h-9 rounded-md border border-input bg-background px-2 text-micro"
      >
        {programs.map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>
      <Button
        size="sm"
        variant="outline"
        disabled={pending || !programId}
        className="min-h-9 rounded-full"
        onClick={() =>
          start(async () => {
            const res = await grantEnrolment(userId, programId);
            setMsg(res.ok ? { ok: true, text: "Granted" } : { ok: false, text: res.error });
          })
        }
      >
        Grant access
      </Button>
      {msg && (
        <span className={`text-micro ${msg.ok ? "text-success" : "text-danger"}`}>{msg.text}</span>
      )}
    </div>
  );
}
