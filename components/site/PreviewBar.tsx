import { previewingDrafts } from "@/lib/site/content";
import { PreviewBarLinks } from "./PreviewBarLinks";

/** Shown on public pages while a Super Administrator previews unpublished edits. */
export async function PreviewBar() {
  if (!(await previewingDrafts().catch(() => false))) return null;
  return (
    <div role="status" className="fixed inset-x-0 bottom-0 z-[60] border-t border-amber-700/40 bg-[#fff4d6] text-[#4a3500]">
      <div className="mx-auto flex max-w-[1320px] flex-wrap items-center gap-x-5 gap-y-2 px-6 py-3 text-[13.5px]">
        <p className="font-medium">Preview: you are seeing unpublished changes. Visitors still see the published page.</p>
        <PreviewBarLinks />
      </div>
    </div>
  );
}
