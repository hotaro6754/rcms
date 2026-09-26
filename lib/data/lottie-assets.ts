/**
 * Registry of third-party animation assets used on the site.
 *
 * The Academy's own illustrations (components/illustration) are the visual identity. A
 * third-party Lottie is used only where it supports a moment without competing with them,
 * and every one is listed here with its source, creator, licence, where it is used, and its
 * weight. Nothing is added to the site without an entry.
 *
 * Evaluated and rejected (Sept 2026), all Lottie Simple License: Online Learning (Flowrame),
 * Happy Students Studying (Boltbite), Analytics Expert (Priyanshu), Teaching or Instructing
 * (Muhammad Tahir), Remix of education (Vishal), Data Extraction (Mahendra), Business
 * Analysis (dhaval). Reasons: generic flat-vector people scenes, isometric or clashing
 * palettes, heavy files, and a style that would read as assembled rather than designed.
 *
 * Licence note: the Lottie Simple License allows use in products, including commercial
 * ones; it does not allow redistributing or reselling the animation files themselves as
 * standalone assets. They are served only as part of this site.
 */

export interface LottieAsset {
  name: string;
  source: string;
  creator: string;
  license: string;
  usage: string;
  format: string;
  /** Path under /public. */
  file: string;
  /** Size of the file as served (uncompressed). */
  size: string;
  modified: string;
}

export const LOTTIE_ASSETS = {
  reporting: {
    name: "reporting",
    source: "https://lottiefiles.com/free-animation/reporting-kbvmxZNIhR",
    creator: "chetna bothra (LottieFiles)",
    license: "Lottie Simple License",
    usage: "Homepage, 05 The monthly review: beside the section heading.",
    format: "Lottie JSON (extracted from the .lottie download)",
    file: "/lottie/reporting.json",
    size: "111 KB (about 15 KB gzipped)",
    modified:
      "Recoloured to the site palette: purples to eucalyptus and sage, navy and greys to warm ink, pale fills to paper. Geometry and timing unchanged.",
  },
} satisfies Record<string, LottieAsset>;

export type LottieKey = keyof typeof LOTTIE_ASSETS;
