import { NextRequest } from 'next/server';
import { getPayload, KVAdapter, PayloadRequest } from 'payload';
import config from '@payload-config';
import { parseBGGCollection } from '@/lib/bgg/parseCollection';
import { hasAPIAccess } from '@/access/RBAC/filters/hasAPIAccess';

const CACHE_VERSION = 'v2'; // Matches the version of BGG API
const FRESH_MS = 5 * 60 * 1000; // 5 minutes
const STALE_MS = 30 * 60 * 1000; // 30 minutes
const RETRY_BACKOFF_MS = 60 * 1000; // 1 minute

type CacheEntry = {
  data: any;
  fetchedAt: number;
  lastAttemptedAt?: number;
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const username = searchParams.get('username');

  if (!username) {
    return Response.json({ error: 'Username is required' }, { status: 400 });
  }

  const payload = await getPayload({ config });
  const kv = payload.kv;
  const key = `bgg:${CACHE_VERSION}:collection:${username}`;
  const now = Date.now();

  // If the user is not authenticated get out
  // TODO: Implement this properly with RBAC overhaul
  /*if (await hasAPIAccess({ req })) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }*/

  const cached = (await kv.get(key)) as CacheEntry | null;

  // If the cached data is considered fresh, return it
  if (cached && now - cached.fetchedAt < FRESH_MS) {
    return respond(cached.data, 'fresh');
  }

  // If the cached data is considered stale, return it but revalidate
  if (cached && now - cached.fetchedAt < STALE_MS) {
    revalidate(username, kv, key, cached, now);
    return respond(cached.data, 'stale');
  }

  // If beyond the th stale time, fech it to update the cache
  const updated = await fetchAndUpdate(username, kv, key, cached);
  if (updated) {
    return respond(updated.data, 'revalidated');
  }

  // If BGG is pending / failed, fallback to last known good
  if (cached) {
    return respond(cached.data, 'fallback');
  }

  return Response.json(
    { status: 'pending', message: 'Fetching from BoardGameGeek' },
    { status: 202 },
  );
}

function respond(data: any, state: string) {
  return Response.json(data, {
    headers: {
      'Cache-Control': 'public, max-age=0, stale-while-revalidate=600',
      'X-Cache-State': state,
    },
  });
}

function revalidate(username: string, kv: KVAdapter, key: string, cached: CacheEntry, now: number) {
  // Respect backoff so admin refresh spam doesn't hammer BGG
  if (cached.lastAttemptedAt && now - cached.lastAttemptedAt < RETRY_BACKOFF_MS) {
    return;
  }

  fetchAndUpdate(username, kv, key, cached);
}

async function fetchAndUpdate(
  username: string,
  kv: KVAdapter,
  key: string,
  cached?: CacheEntry | null,
): Promise<CacheEntry | null> {
  const res = await fetch(
    `https://boardgamegeek.com/xmlapi2/collection?username=${username}&subtype=boardgame&own=1&excludesubtype=boardgameexpansion`,
    {
      headers: {
        Authorization: `Bearer ${process.env.BGG_API_KEY}`,
      },
    },
  );

  const xml = await res.text();

  // Record attempt even if pending
  if (cached) {
    await kv.set(key, {
      ...cached,
      lastAttemptedAt: Date.now(),
    });
  }

  if (res.status === 202 || xml.includes('Your request has ben accepted')) {
    return null;
  }

  const data = parseBGGCollection(xml);
  const entry: CacheEntry = {
    data,
    fetchedAt: Date.now(),
  };

  await kv.set(key, entry);
  return entry;
}
