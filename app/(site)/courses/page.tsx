import { permanentRedirect } from "next/navigation";

/** The course list now lives in the live catalogue; old links keep working. */
export default function CoursesPage() {
  permanentRedirect("/catalog");
}
