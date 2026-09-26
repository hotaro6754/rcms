/**
 * Photography on the public site.
 *
 * The site's identity is typography, original illustration and motion (see
 * components/illustration). It is complete with no photographs at all, and stock
 * photography is not used. A photograph is added only when it carries information an
 * illustration cannot: a verified portrait of a real instructor, or a real student's story.
 *
 * The founder portrait is the first such slot. Put the real photo at
 * /public/images/founder.jpg and set FOUNDER_PORTRAIT; the founder section switches from
 * its typographic panel to the photograph.
 */

export interface Photo {
  src: string;
  alt: string;
  width: number;
  height: number;
}

/** Set to a Photo once the real portrait is in /public/images/founder.jpg. */
export const FOUNDER_PORTRAIT: Photo | null = null;
