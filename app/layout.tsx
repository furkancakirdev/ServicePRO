import type { Metadata } from 'next';
import { Manrope, Space_Grotesk } from 'next/font/google';
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
    <html lang="tr">
      <body className={`${manrope.variable} ${spaceGrotesk.variable}`}>
        <AuthProvider>
          <Sidebar />
          <main className="main-content">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
