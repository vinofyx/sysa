import type { Metadata } from 'next';
import { Toaster } from 'sonner';

import { QueryProvider } from '@/components/providers/query-provider';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { TooltipProvider } from '@/components/ui/tooltip';

import './globals.css';

export const metadata: Metadata = {
  // Resolves relative URLs in metadata (e.g. any page that doesn't supply a
  // fully-qualified OG image) against the real site origin instead of
  // Next.js's localhost fallback — every current page already uses absolute
  // Cloudinary URLs, so this is a correctness hardening, not a bug fix for
  // an observed broken image.
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://sysa.in'),
  title: 'Sai Yadadri Seva Ashram',
  description: 'Maanava Sevaaye Madhava Seva – Service to Humanity is Service to God.',
  icons: {
    icon: [
      { url: '/favicon-v2.ico', sizes: '16x16 32x32 48x48', type: 'image/x-icon' },
      { url: '/icon-v2.png', type: 'image/png', sizes: '32x32' },
    ],
    apple: [{ url: '/apple-touch-icon-v2.png', sizes: '180x180', type: 'image/png' }],
    shortcut: '/favicon-v2.ico',
  },
  openGraph: {
    title: 'Sai Yadadri Seva Ashram',
    description: 'Maanava Sevaaye Madhava Seva – Service to Humanity is Service to God.',
    url: 'https://sysa.in/',
    siteName: 'Sai Yadadri Seva Ashram',
    locale: 'en',
    type: 'website',
    images: [
      {
        url: 'https://sysa.in/whatsapp-preview-v3.jpg',
        secureUrl: 'https://sysa.in/whatsapp-preview-v3.jpg',
        type: 'image/jpeg',
        width: 1200,
        height: 630,
        alt: 'Sai Yadadri Seva Ashram official banner',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sai Yadadri Seva Ashram',
    description: 'Maanava Sevaaye Madhava Seva – Service to Humanity is Service to God.',
    images: ['https://sysa.in/whatsapp-preview-v3.jpg'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="h-full antialiased">
      <body className="flex min-h-full flex-col" suppressHydrationWarning>
        <ThemeProvider>
          <QueryProvider>
            <TooltipProvider>
              {children}
              <Toaster richColors closeButton position="top-right" />
            </TooltipProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
