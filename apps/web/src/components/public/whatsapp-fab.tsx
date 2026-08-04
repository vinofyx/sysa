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
      className="bg-pub-primary-700 shadow-pub-lg fixed right-5 bottom-5 z-40 flex size-14 items-center justify-center rounded-full text-white transition-transform hover:scale-105"
    >
      <MessageCircle className="size-6" aria-hidden="true" />
    </a>
  );
}
