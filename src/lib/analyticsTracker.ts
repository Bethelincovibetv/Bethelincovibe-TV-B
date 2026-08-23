/**
 * Platform Analytics & Daily Visitor Tracker Helper
 * Records page views, direct traffic, product views, business profile views, blog reads,
 * and handles time-series aggregation for the Platform Intelligence Dashboard.
 */

export interface PageViewEvent {
  id: string;
  timestamp: string; // ISO String
  date: string; // YYYY-MM-DD
  path: string;
  title?: string;
  featureType: 'direct' | 'product' | 'business' | 'blog' | 'course' | 'sales_page' | 'ad' | 'general';
  entityId?: string;
  source: 'direct' | 'organic' | 'social' | 'referral' | 'email';
  device: 'mobile' | 'desktop';
  referrer?: string;
}

const STORAGE_KEY = 'platform_analytics_events_v1';
const MAX_LOCAL_EVENTS = 1000;

/**
 * Record a page visit or interaction
 */
export function recordPageView(params: {
  path: string;
  title?: string;
  featureType?: PageViewEvent['featureType'];
  entityId?: string;
}) {
  if (typeof window === 'undefined') return;

  try {
    const referrer = document.referrer;
    let source: PageViewEvent['source'] = 'direct';

    if (referrer) {
      if (referrer.includes('google') || referrer.includes('bing') || referrer.includes('duckduckgo') || referrer.includes('yahoo')) {
        source = 'organic';
      } else if (referrer.includes('facebook') || referrer.includes('twitter') || referrer.includes('instagram') || referrer.includes('linkedin') || referrer.includes('t.co')) {
        source = 'social';
      } else if (referrer.includes('mail') || referrer.includes('gmail')) {
        source = 'email';
      } else if (!referrer.includes(window.location.hostname)) {
        source = 'referral';
      }
    }

    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];

    // Determine feature type from path if not provided
    let featureType = params.featureType || 'general';
    if (!params.featureType) {
      if (params.path === '/' || params.path === '' || source === 'direct') {
        featureType = 'direct';
      } else if (params.path.startsWith('/products') || params.path.startsWith('/product/')) {
        featureType = 'product';
      } else if (params.path.startsWith('/business') || params.path.startsWith('/directory')) {
        featureType = 'business';
      } else if (params.path.startsWith('/blog')) {
        featureType = 'blog';
      } else if (params.path.startsWith('/learn') || params.path.startsWith('/courses')) {
        featureType = 'course';
      } else if (params.path.startsWith('/sales')) {
        featureType = 'sales_page';
      } else if (params.path.startsWith('/ads')) {
        featureType = 'ad';
      }
    }

    const newEvent: PageViewEvent = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: now.toISOString(),
      date: dateStr,
      path: params.path,
      title: params.title || document.title,
      featureType,
      entityId: params.entityId,
      source,
      device: isMobile ? 'mobile' : 'desktop',
      referrer: referrer || undefined,
    };

    const existingJson = localStorage.getItem(STORAGE_KEY);
    const events: PageViewEvent[] = existingJson ? JSON.parse(existingJson) : [];
    
    events.unshift(newEvent);
    if (events.length > MAX_LOCAL_EVENTS) {
      events.length = MAX_LOCAL_EVENTS;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  } catch (err) {
    console.warn('Analytics tracking error:', err);
  }
}

/**
 * Get stored analytics events
 */
export function getStoredAnalyticsEvents(): PageViewEvent[] {
  if (typeof window === 'undefined') return [];
  try {
    const json = localStorage.getItem(STORAGE_KEY);
    return json ? JSON.parse(json) : [];
  } catch {
    return [];
  }
}
