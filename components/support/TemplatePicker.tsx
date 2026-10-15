"use client";

/** Inserts an approved response into the reply box. Only approved templates are offered. */
export function TemplatePicker({ templates, target }: { templates: { id: string; title: string; body: string }[]; target: string }) {
  return (
    <label className="flex items-center gap-2 text-[12.5px]">
      Approved response
      <select
        defaultValue=""
        onChange={(e) => {
          const t = templates.find((x) => x.id === e.target.value);
          const box = document.getElementById(target) as HTMLTextAreaElement | null;
          if (t && box) box.value = box.value ? `${box.value}\n\n${t.body}` : t.body;
          e.target.value = "";
        }}
        className="min-h-8 rounded-[3px] border border-input bg-card px-2 text-[12.5px]"
      >
        <option value="">Insert…</option>
        {templates.map((t) => (
          <option key={t.id} value={t.id}>
            {t.title}
          </option>
        ))}
      </select>
    </label>
  );
}
