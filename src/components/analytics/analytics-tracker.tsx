
'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useRef } from 'react';

export function AnalyticsTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    let interval: NodeJS.Timeout;

    const initTracking = async () => {
      // Check if user is admin
      try {
        const res = await fetch('/api/auth/session');
        if (res.ok) {
           const session = await res.json();
           if (session?.user?.role === 'ADMIN') {
             // Do not track admins
             return;
           }
        }
      } catch (e) {
        // Ignore error and proceed to track
      }

      // Function to send event
      const sendEvent = async (event: string, extra = {}) => {
        try {
          await fetch('/api/analytics/track', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              event,
              url: window.location.pathname,
              referrer: document.referrer,
              userAgent: navigator.userAgent,
              width: window.innerWidth,
              height: window.innerHeight,
              title: document.title,
              ...extra
            }),
          });
        } catch (err) {
          console.error('Tracking Error:', err);
        }
      };

      // Send PAGE_VIEW on mount and on path change
      sendEvent('PAGE_VIEW');

      // Heartbeat to track duration (every 5 seconds)
      interval = setInterval(() => {
          // Only send heartbeat if tab is visible
          if (document.visibilityState === 'visible') {
              sendEvent('HEARTBEAT');
          }
      }, 5000);
    };

    initTracking();

    return () => clearInterval(interval);
  }, [pathname, searchParams]);

  return null;
}
