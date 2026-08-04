import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { Toaster } from 'sonner';

import { QueryProvider } from '@/components/providers/query-provider';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { TooltipProvider } from '@/components/ui/tooltip';

import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  // Resolves relative URLs in metadata (e.g. any page that doesn't supply a
  // fully-qualified OG image) against the real site origin instead of
  // Next.js's localhost fallback — every current page already uses absolute
  // Cloudinary URLs, so this is a correctness hardening, not a bug fix for
  // an observed broken image.
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: 'Sai Yadadri Seva Ashram',
  description:
    'Sai Yadadri Seva Ashram — a registered social service society supporting elderly care, Annaprasadam, Goshala, and education programs in Hyderabad, Telangana.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
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
