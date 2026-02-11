import type { Metadata } from 'next';
import { Manrope, Space_Grotesk } from 'next/font/google';
import { Toaster } from 'sonner';
import './globals.css';
import Sidebar from '@/components/Sidebar';
import { AuthProvider } from '@/lib/auth/auth-context';

const manrope = Manrope({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-body',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-display',
});

export const metadata: Metadata = {
  title: 'ServicePRO - Tekne Teknik Servis Takip Sistemi',
  description: 'Marlin Yatçılık teknik servis birimi için servis takip, personel yönetimi ve puanlama sistemi',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr" className="dark">
      <body className={`${manrope.variable} ${spaceGrotesk.variable} min-h-screen bg-[#0f172a] text-slate-100`}>
        <AuthProvider>
          <Sidebar />
          <main className="main-content">{children}</main>
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
        </AuthProvider>
      </body>
    </html>
  );
}
