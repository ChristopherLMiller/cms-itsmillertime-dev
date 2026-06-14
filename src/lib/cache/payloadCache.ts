import { UpstashCache } from '@/lib/cache/upstashCache';

export const PAYLOAD_CACHE_TTL_S = 86400;

export const LAYOUT_SITE_META_CACHE_KEY = 'layout:site-meta';
export const LAYOUT_SITE_NAVIGATION_CACHE_KEY = 'layout:site-navigation';

let cache: UpstashCache | null = null;

export function getPayloadCache(): UpstashCache | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  if (!cache) {
    cache = new UpstashCache({
      url,
      token,
      prefix: 'payload:',
      ttl: PAYLOAD_CACHE_TTL_S,
    });
  }

  return cache;
}

export function payloadCacheKey(segment: string): string {
  const manager = getPayloadCache();
  if (!manager) {
    return `payload:${segment}`;
  }
  return manager.createKey(segment);
}

export async function setPayloadCache(segment: string, value: unknown): Promise<void> {
  const manager = getPayloadCache();
  if (!manager) {
    console.warn('[payload-cache] Upstash not configured; skipping cache update');
    return;
  }

  await manager.set(manager.createKey(segment), value);
}

export async function removePayloadCache(segment: string): Promise<void> {
  const manager = getPayloadCache();
  if (!manager) return;

  await manager.del(manager.createKey(segment));
}
