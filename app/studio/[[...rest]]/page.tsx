import { redirect } from "next/navigation";

/**
 * Trainer Studio moved into the Admin Control Center: authoring is /admin/content and lab
 * grading is /admin/grading. Old bookmarks land in the right place.
 */
export default async function StudioRedirect({ params }: { params: Promise<{ rest?: string[] }> }) {
  const { rest = [] } = await params;
  redirect(rest[0] === "grading" ? "/admin/grading" : "/admin/content");
}
