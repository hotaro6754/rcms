/**
 * Quiet, CSS-only gradient environments behind the light sections. Each variant has a job:
 *
 *   mesh    the tiers. Soft structure; the pools deepen with the tier being read
 *           (the parent sets data-tier, see globals.css .field-mesh).
 *   grain   the leadership ladder. Printed texture, editorial maturity.
 *   radial  the governance review and the footer. A single source of light: focus.
 *
 * The parent must be `relative isolate` so the field sits behind content, not the page.
 */
type Variant = "mesh" | "grain" | "radial";

export function SectionField({ variant, ink = false }: { variant: Variant; ink?: boolean }) {
  if (variant === "grain") {
    return (
      <div aria-hidden="true" className="field">
        <div className="field-radial absolute inset-0 opacity-60" />
        <div className="grain absolute inset-0 !opacity-[0.12]" />
      </div>
    );
  }
  return (
    <div aria-hidden="true" className={`field field-${variant}${ink ? " is-ink" : ""}`} />
  );
}
