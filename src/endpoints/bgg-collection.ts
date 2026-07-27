import { parseBGGCollection } from '@/lib/bgg/parseCollection';
import type { KVAdapter, PayloadRequest } from 'payload';
import { headersWithCors } from 'payload';

/**
 * Public BGG collection proxy with Redis KV stale-while-revalidate.
 *   GET /api/bgg/collection?username=...&stats=0|1
 */

const CACHE_VERSION = 'v3';
const FRESH_MS = 5 * 60 * 1000;
const STALE_MS = 30 * 60 * 1000;
const RETRY_BACKOFF_MS = 60 * 1000;

type CacheEntry = {
  data: unknown;
  fetchedAt: number;
  lastAttemptedAt?: number;
};

function parseStatsParam(searchParams: URLSearchParams): 0 | 1 | Response {
  const raw = searchParams.get('stats');
  if (raw === null || raw === '') return 0;
  if (raw === '0') return 0;
  if (raw === '1') return 1;
  return Response.json({ error: 'stats must be 0 or 1' }, { status: 400 });
}

function respond(req: PayloadRequest, data: unknown, state: string): Response {
  return Response.json(data, {
    headers: headersWithCors({
      headers: new Headers({
        'Cache-Control': 'public, max-age=0, stale-while-revalidate=600',
        'X-Cache-State': state,
      }),
      req,
    }),
  });
}

function revalidate(
  username: string,
  kv: KVAdapter,
  key: string,
  cached: CacheEntry,
  now: number,
  stats: 0 | 1,
) {
  if (cached.lastAttemptedAt && now - cached.lastAttemptedAt < RETRY_BACKOFF_MS) {
    return;
  }

  void fetchAndUpdate(username, kv, key, cached, stats);
}

async function fetchAndUpdate(
  username: string,
  kv: KVAdapter,
  key: string,
  cached: CacheEntry | null | undefined,
  stats: 0 | 1,
): Promise<CacheEntry | null> {
  const res = await fetch(
    `https://boardgamegeek.com/xmlapi2/collection?username=${encodeURIComponent(username)}&subtype=boardgame&own=1&excludesubtype=boardgameexpansion&stats=${stats}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.BGG_API_KEY}`,
      },
    },
  );

  const xml = await res.text();

  if (cached) {
    await kv.set(key, {
      ...cached,
      lastAttemptedAt: Date.now(),
    });
  }

  if (res.status === 202 || xml.includes('Your request has ben accepted')) {
    return null;
  }

  const data = parseBGGCollection(xml, { includeStats: stats === 1 });
  const entry: CacheEntry = {
    data,
    fetchedAt: Date.now(),
  };

  await kv.set(key, entry);
  return entry;
}

export async function bggCollectionHandler(req: PayloadRequest): Promise<Response> {
  try {
    if (!req.url) {
      return Response.json({ error: 'Invalid request URL' }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const username = searchParams.get('username');

    if (!username) {
      return Response.json({ error: 'Username is required' }, { status: 400 });
    }

    const stats = parseStatsParam(searchParams);
    if (stats instanceof Response) {
      return stats;
    }

    const kv = req.payload.kv;
    const key = `bgg:${CACHE_VERSION}:collection:${username}:stats:${stats}`;
    const now = Date.now();

    const cached = (await kv.get(key)) as CacheEntry | null;

    if (cached && now - cached.fetchedAt < FRESH_MS) {
      return respond(req, cached.data, 'fresh');
    }

    if (cached && now - cached.fetchedAt < STALE_MS) {
      revalidate(username, kv, key, cached, now, stats);
      return respond(req, cached.data, 'stale');
    }

    const updated = await fetchAndUpdate(username, kv, key, cached, stats);
    if (updated) {
      return respond(req, updated.data, 'revalidated');
    }

    if (cached) {
      return respond(req, cached.data, 'fallback');
    }

    return Response.json(
      { status: 'pending', message: 'Fetching from BoardGameGeek' },
      {
        status: 202,
        headers: headersWithCors({ headers: new Headers(), req }),
      },
    );
  } catch (error) {
    console.error('BGG collection endpoint error:', error);
    return Response.json(
      { error: 'Failed to fetch BGG collection' },
      {
        status: 500,
        headers: headersWithCors({ headers: new Headers(), req }),
      },
    );
  }
}
