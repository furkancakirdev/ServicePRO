import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Playfair_Display, Inter } from 'next/font/google';
import { Toaster } from 'sonner';
import './globals.css';
import AppShell from '@/components/app-shell';
import { ThemeProvider } from '@/components/ThemeProvider';
import { AuthProvider } from '@/lib/auth/auth-context';
import { UiRedesignProvider } from '@/components/ui/ui-redesign-provider';

// Grand Maritime Typography
// Playfair Display: Classic serif for headings, titles, and elegant text
const playfairDisplay = Playfair_Display({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-display',
  weight: ['400', '500', '600', '700', '800', '900'],
});

// Inter: Modern sans-serif for body text, UI elements, and readability
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-body',
  weight: ['300', '400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'ServicePro | Tekne Teknik Servis Yonetimi',
  description:
    'Marlin Yatcilik teknik servis birimi icin servis takibi, personel yonetimi ve performans puanlama sistemi.',
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
  },
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <body className={`${playfairDisplay.variable} ${inter.variable} min-h-screen bg-background text-foreground`}>
        <ThemeProvider>
          <AuthProvider>
            <UiRedesignProvider>
              <AppShell>{children}</AppShell>
              <Toaster
                position="top-right"
                richColors
                closeButton
                toastOptions={{
                  style: {
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text)',
                  },
                }}
              />
            </UiRedesignProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
