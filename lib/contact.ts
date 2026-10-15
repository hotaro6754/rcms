/**
 * Public contact channels. The WhatsApp link appears only when a real number is configured
 * (NEXT_PUBLIC_WHATSAPP_NUMBER, digits with country code), so the site never shows a dead link.
 */
export function whatsappUrl(): string | null {
  const n = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "").replace(/\D/g, "");
  return n.length >= 10 ? `https://wa.me/${n}` : null;
}
