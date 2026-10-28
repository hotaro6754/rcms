/** Which addresses editable content may link to or show. Pure; used by the site editor and designs. */

/** Links may point within the site, to an anchor, to an https page or to an email address. */
export function safeHref(href: string) {
  const h = href.trim();
  if (h.startsWith("/") && !h.startsWith("//")) return true;
  if (h.startsWith("#")) return true;
  return /^https:\/\/[^\s/]+\.[^\s]+$/i.test(h) || /^mailto:[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(h);
}

/** Images come from the site's own files or from a public image in the media library. */
export function safeImageSrc(src: string) {
  return /^\/(media|images|lottie)\/[\w\-./]+$/.test(src) && !src.includes("..") ? true : /^\/api\/media\/[a-z0-9]{10,40}$/i.test(src);
}
