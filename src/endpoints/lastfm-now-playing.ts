import { getTrustedOrigins } from '@/lib/auth/trustedOrigins';
import { parseRecentTracksPayload, type NowPlayingResponse } from '@/lib/lastfm/parseRecentTracks';
import type { PayloadRequest } from 'payload';
import { headersWithCors } from 'payload';

/**
 * Public Last.fm now-playing proxy with Redis KV cache.
 *   GET /api/lastfm/now-playing
 *
 * CORS: uses Payload `headersWithCors`, then upgrades Allow-Origin when the
 * request Origin is a trusted / *.itsmillertime.dev preview host.
 */

const CACHE_VERSION = 'v1';
const FRESH_MS = 60 * 1000;
const CACHE_KEY = `payload:lastfm:${CACHE_VERSION}:now-playing`;

type CacheEntry = {
  data: NowPlayingResponse;
  fetchedAt: number;
};

function normalizeOrigin(o: string): string {
  return o.replace(/\/$/, '');
}

function corsOriginFor(req: PayloadRequest): string | null {
  const origin = req.headers.get('origin');
  if (!origin) return null;
  // PayloadRequest is Request-like; trustedOrigins only needs headers/url.
  const allowed = getTrustedOrigins(req as unknown as Request);
  const n = normalizeOrigin(origin);
  for (const a of allowed) {
    if (normalizeOrigin(a) === n) return origin;
  }
  return null;
}

function applyCors(req: PayloadRequest, headers: Headers): Headers {
  const withPayload = headersWithCors({ headers, req });
  const cors = corsOriginFor(req);
  if (cors) {
    withPayload.set('Access-Control-Allow-Origin', cors);
    withPayload.set('Vary', 'Origin');
  }
  return withPayload;
}

function jsonWithCors(
  req: PayloadRequest,
  data: NowPlayingResponse,
  status: number,
  extraHeaders?: Record<string, string>,
): Response {
  return Response.json(data, {
    status,
    headers: applyCors(req, new Headers(extraHeaders)),
  });
}

export async function lastfmNowPlayingHandler(req: PayloadRequest): Promise<Response> {
  const apiKey = process.env.LASTFM_API_KEY;
  const username = process.env.LASTFM_USERNAME;
  const empty: NowPlayingResponse = { isPlaying: false, track: null };

  if (!apiKey?.trim() || !username?.trim()) {
    return jsonWithCors(req, empty, 503);
  }

  try {
    const kv = req.payload.kv;
    const now = Date.now();
    const cached = (await kv.get(CACHE_KEY)) as CacheEntry | null;

    if (cached && now - cached.fetchedAt < FRESH_MS) {
      return jsonWithCors(req, cached.data, 200, {
        'Cache-Control': 'public, max-age=30, stale-while-revalidate=120',
        'X-Cache-State': 'hit',
      });
    }

    const url = new URL('https://ws.audioscrobbler.com/2.0/');
    url.searchParams.set('method', 'user.getrecenttracks');
    url.searchParams.set('user', username.trim());
    url.searchParams.set('api_key', apiKey.trim());
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', '1');

    const res = await fetch(url.toString(), { method: 'GET' });

    if (!res.ok) {
      if (cached) {
        return jsonWithCors(req, cached.data, 200, {
          'Cache-Control': 'public, max-age=0, stale-while-revalidate=300',
          'X-Cache-State': 'stale-error',
        });
      }
      return jsonWithCors(req, empty, 502);
    }

    const body: unknown = await res.json();
    const data = parseRecentTracksPayload(body);

    await kv.set(CACHE_KEY, { data, fetchedAt: Date.now() } satisfies CacheEntry);

    return jsonWithCors(req, data, 200, {
      'Cache-Control': 'public, max-age=30, stale-while-revalidate=120',
      'X-Cache-State': 'miss',
    });
  } catch (error) {
    console.error('Last.fm now-playing endpoint error:', error);
    return jsonWithCors(req, empty, 500);
  }
}
