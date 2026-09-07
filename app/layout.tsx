import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { LanguageProvider } from '@/context/LanguageContext';
import { SyncProvider } from '@/context/SyncContext';

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
    <html lang="en" className="h-full bg-slate-100">
      <head>
        <meta name="theme-color" content="#1e3a8a" />
      </head>
      <body className={`min-h-full flex flex-col font-sans antialiased text-slate-800 bg-slate-100 ${inter.className}`}>
        <AuthProvider>
          <LanguageProvider>
            <SyncProvider>
              {children}
            </SyncProvider>
          </LanguageProvider>
        </AuthProvider>

        {/* Service Worker registration script */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').catch(function(err) {
                    console.log('SW registration skipped:', err);
                  });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
