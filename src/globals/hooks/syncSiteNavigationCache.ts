import { cacheDel, cacheKeys } from '@/lib/cache';
import type { GlobalAfterChangeHook } from 'payload';

export const syncSiteNavigationCache: GlobalAfterChangeHook = async ({ doc }) => {
  try {
    await cacheDel(cacheKeys.siteNavigation);
  } catch (err) {
    console.error('[cache] Failed to invalidate site-navigation cache:', err);
  }

  return doc;
};
