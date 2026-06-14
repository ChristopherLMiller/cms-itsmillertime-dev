import { cacheDel, cacheKeys } from '@/lib/cache';
import type { GlobalAfterChangeHook } from 'payload';

export const syncSiteMetaCache: GlobalAfterChangeHook = async ({ doc }) => {
  try {
    await cacheDel(cacheKeys.siteMeta);
  } catch (err) {
    console.error('[cache] Failed to invalidate site-meta cache:', err);
  }

  return doc;
};
