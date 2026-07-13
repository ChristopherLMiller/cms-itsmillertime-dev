import { Redis } from 'ioredis';

/** Single source of truth for the keys the www frontend reads. */
export const cacheKeys = {
  article: (id: number | string) => `payload:article:${id}`,
  siteMeta: 'payload:layout:meta',
  siteNavigation: 'payload:layout:nav',
} as const;

let redis: Redis | null = null;

function getRedis(): Redis | null {
  const url = process.env.REDIS_URL;
  if (!url) {
    console.warn('[cache] REDIS_URL not configured; skipping cache invalidation');
    return null;
  }
  if (!redis) redis = new Redis(url);
  return redis;
}

/** Drop a key so the next www read misses and repopulates fresh from the CMS. */
export async function cacheDel(key: string): Promise<void> {
  const client = getRedis();
  if (!client) return;
  await client.del(key);
}
