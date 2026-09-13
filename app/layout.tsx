import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { LanguageProvider } from '@/context/LanguageContext';
import { SyncProvider } from '@/context/SyncContext';
import { ServiceWorkerRegister } from '@/components/layout/ServiceWorkerRegister';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'SwasthyaSetu — Maharashtra Integrated Public Healthcare & Referral Management System',
  description: 'Public Health Department, Government of Maharashtra. ABDM & FHIR R4 Compliant Healthcare & Smart Triage Referral Platform.',
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className="h-full bg-slate-100 dark:bg-slate-950">
      <head>
        <meta name="theme-color" content="#1e3a8a" />
      </head>
      <body suppressHydrationWarning className={`min-h-full flex flex-col font-sans antialiased text-slate-800 dark:text-slate-100 bg-slate-100 dark:bg-slate-950 ${inter.className}`}>
        <AuthProvider>
          <LanguageProvider>
            <SyncProvider>
              {children}
            </SyncProvider>
          </LanguageProvider>
        </AuthProvider>

        {/* Service Worker registration via client component */}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
