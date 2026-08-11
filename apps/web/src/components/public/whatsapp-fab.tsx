import { MessageCircle } from 'lucide-react';

/** Persistent WhatsApp floating action button (design/05-Wireframes.md — Home
 * wireframe). Renders nothing if the Ashram hasn't configured a WhatsApp
 * number in Website Settings yet — never a fabricated placeholder number. */
export function WhatsAppFab({ whatsappNumber }: { whatsappNumber: string | null }) {
  if (!whatsappNumber) return null;

  const digits = whatsappNumber.replace(/[^\d]/g, '');

  return (
    <a
      href={`https://wa.me/${digits}`}
      target="_blank"
      rel="noreferrer"
      aria-label="Chat with us on WhatsApp"
      className="fixed right-5 bottom-5 z-40 flex size-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-[0_8px_28px_rgba(37,211,102,0.55)] transition-transform duration-300 hover:scale-110"
    >
      <span className="absolute inset-0 animate-ping rounded-full bg-[#25D366] opacity-40" />
      <MessageCircle className="relative size-6" aria-hidden="true" fill="currentColor" />
    </a>
  );
}
