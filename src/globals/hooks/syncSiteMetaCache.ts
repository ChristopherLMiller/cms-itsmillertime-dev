import { LAYOUT_SITE_META_CACHE_KEY, setPayloadCache } from '@/lib/cache/payloadCache';
import type { SiteMeta } from '@/payload-types';
import type { GlobalAfterChangeHook } from 'payload';

export const syncSiteMetaCache: GlobalAfterChangeHook = async ({ doc, req }) => {
  try {
    const siteMeta = await req.payload.findGlobal({
      slug: 'site-meta',
      depth: 1,
      overrideAccess: true,
    });

    if (siteMeta) {
      await setPayloadCache(LAYOUT_SITE_META_CACHE_KEY, siteMeta as SiteMeta);
    }
  } catch (err) {
    console.error('[layout-cache] Failed to sync site-meta global:', err);
  }

  return doc;
};
