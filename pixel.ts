import type { AdSettings } from '../types/store.ts';

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    _fbq?: unknown;
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
    ttq?: {
      track?: (event: string, data?: Record<string, unknown>) => void;
      page?: () => void;
    };
  }
}

let initializedMetaId = '';
let initializedGoogleId = '';
let initializedTiktokId = '';

export function initAdPixels(settings: AdSettings) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const metaId = settings.metaPixelId.trim();
  if (metaId && /^\d{8,20}$/.test(metaId) && initializedMetaId !== metaId) {
    initializedMetaId = metaId;
    if (!window.fbq) {
      const n = function (...args: unknown[]) {
        (n as unknown as { queue: unknown[][] }).queue.push(args);
      } as unknown as {
        (...args: unknown[]): void;
        queue: unknown[][];
        loaded: boolean;
        version: string;
      };
      n.queue = [];
      n.loaded = true;
      n.version = '2.0';
      window.fbq = n;
      const script = document.createElement('script');
      script.async = true;
      script.src = 'https://connect.facebook.net/en_US/fbevents.js';
      document.head.appendChild(script);
    }
    window.fbq('init', metaId);
    window.fbq('track', 'PageView');
  }

  const googleId = settings.googleTagId.trim();
  if (googleId && /^(G|AW|GT)-[A-Z0-9]+$/i.test(googleId) && initializedGoogleId !== googleId) {
    initializedGoogleId = googleId;
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(googleId)}`;
    document.head.appendChild(script);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function (...args: unknown[]) {
      window.dataLayer?.push(args);
    };
    window.gtag('js', new Date());
    window.gtag('config', googleId);
  }

  const tiktokId = settings.tiktokPixelId.trim();
  if (tiktokId && /^[A-Z0-9]{10,30}$/i.test(tiktokId) && initializedTiktokId !== tiktokId) {
    initializedTiktokId = tiktokId;
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://analytics.tiktok.com/i18n/pixel/events.js?sdkid=${encodeURIComponent(tiktokId)}&lib=ttq`;
    document.head.appendChild(script);
  }
}

export function trackAdEvent(
  eventName: 'ViewContent' | 'AddToCart' | 'InitiateCheckout' | 'Purchase' | 'OutboundClick',
  payload: Record<string, unknown>,
) {
  if (typeof window === 'undefined') return;
  try {
    if (window.fbq) {
      if (eventName === 'OutboundClick') {
        window.fbq('trackCustom', 'OutboundStoreClick', payload);
      } else {
        window.fbq('track', eventName, payload);
      }
    }
    if (window.gtag) {
      const gMap: Record<string, string> = {
        ViewContent: 'view_item',
        AddToCart: 'add_to_cart',
        InitiateCheckout: 'begin_checkout',
        Purchase: 'purchase',
        OutboundClick: 'select_content',
      };
      window.gtag('event', gMap[eventName] || eventName, payload);
    }
    if (window.ttq?.track) {
      window.ttq.track(eventName === 'OutboundClick' ? 'ClickButton' : eventName, payload);
    }
  } catch {
    // Ignore ad-blocker errors
  }
}
