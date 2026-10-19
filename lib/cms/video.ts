/** Video embeds: only these hosts, always in a sandboxed iframe. Pure. */

export const VIDEO_HOSTS = [
  "www.youtube-nocookie.com",
  "www.youtube.com",
  "youtube.com",
  "youtu.be",
  "player.vimeo.com",
  "vimeo.com",
  "iframe.mediadelivery.net",
  "stream.mux.com",
  "customer-",
];

export function videoEmbedUrl(url: string): string | null {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  if (u.protocol !== "https:") return null;
  const host = u.hostname;
  if (host === "youtu.be") return `https://www.youtube-nocookie.com/embed/${u.pathname.slice(1)}`;
  if (host.endsWith("youtube.com") || host === "www.youtube-nocookie.com") {
    const id = u.searchParams.get("v") ?? (u.pathname.startsWith("/embed/") ? u.pathname.split("/")[2] : null);
    return id && /^[\w-]{6,20}$/.test(id) ? `https://www.youtube-nocookie.com/embed/${id}` : null;
  }
  if (host === "vimeo.com") {
    const id = u.pathname.split("/").filter(Boolean)[0];
    return id && /^\d+$/.test(id) ? `https://player.vimeo.com/video/${id}` : null;
  }
  if (host === "player.vimeo.com" || host === "iframe.mediadelivery.net" || host === "stream.mux.com") return u.toString();
  if (/^customer-[a-z0-9]+\.cloudflarestream\.com$/.test(host)) return u.toString();
  return null;
}
