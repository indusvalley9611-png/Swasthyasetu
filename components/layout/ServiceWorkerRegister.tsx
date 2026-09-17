'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // 1. Register Service Worker
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker
          .register('/sw.js')
          .catch((err) => {
            console.log('SW registration skipped:', err);
          });
      }

      // 2. Capture PWA Install Prompt globally for install banner triggers
      const handleBeforeInstall = (e: Event) => {
        e.preventDefault();
        (window as any).deferredPwaPrompt = e;
      };

      window.addEventListener('beforeinstallprompt', handleBeforeInstall);
      return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      };
    }
  }, []);

  return null;
}
