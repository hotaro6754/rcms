"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { startAttempt } from "@/lib/actions/labs";
import { Button } from "@/components/ui/button";

export function StartLabButton({ scenarioId }: { scenarioId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        disabled={pending}
        className="min-h-11 rounded-full"
        onClick={() =>
          start(async () => {
            setError(null);
            const res = await startAttempt(scenarioId);
            if (res.ok) router.push(`/labs/${res.data.id}`);
            else setError("Could not open the lab. Try again.");
          })
        }
      >
        {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
        Start the review
      </Button>
      {error && (
        <span role="alert" className="text-micro text-danger">
          {error}
        </span>
      )}
    </div>
  );
}
