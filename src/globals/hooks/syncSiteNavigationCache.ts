import { LAYOUT_SITE_NAVIGATION_CACHE_KEY, setPayloadCache } from '@/lib/cache/payloadCache';
import type { SiteNavigation } from '@/payload-types';
import type { GlobalAfterChangeHook } from 'payload';

function sortNavigation(global: SiteNavigation): SiteNavigation {
  const navItems = global.navItems
    ? [...global.navItems]
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map((item) => ({
          ...item,
          childNodes: item.childNodes
            ? [...item.childNodes].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
            : item.childNodes,
        }))
    : global.navItems;

  return { ...global, navItems };
}

export const syncSiteNavigationCache: GlobalAfterChangeHook = async ({ doc, req }) => {
  try {
    const navigation = await req.payload.findGlobal({
      slug: 'site-navigation',
      depth: 1,
      overrideAccess: true,
    });

    if (navigation) {
      await setPayloadCache(
        LAYOUT_SITE_NAVIGATION_CACHE_KEY,
        sortNavigation(navigation as SiteNavigation),
      );
    }
  } catch (err) {
    console.error('[layout-cache] Failed to sync site-navigation global:', err);
  }

  return doc;
};
