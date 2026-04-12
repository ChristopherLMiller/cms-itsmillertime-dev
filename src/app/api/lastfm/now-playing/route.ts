import { getPayload } from 'payload';
import config from '@payload-config';
import { NextRequest, NextResponse } from 'next/server';
import { getTrustedOrigins } from '@/lib/auth/trustedOrigins';
import { parseRecentTracksPayload, type NowPlayingResponse } from '@/lib/lastfm/parseRecentTracks';

const CACHE_VERSION = 'v1';
/** Min time between upstream Last.fm calls per deploy (rate limit friendly). */
const FRESH_MS = 60 * 1000;

type CacheEntry = {
  data: NowPlayingResponse;
  fetchedAt: number;
};

const CACHE_KEY = `payload:lastfm:${CACHE_VERSION}:now-playing`;

function normalizeOrigin(o: string): string {
  return o.replace(/\/$/, '');
}

function corsOriginFor(req: NextRequest): string | null {
  const origin = req.headers.get('origin');
  if (!origin) return null;
  const allowed = getTrustedOrigins(req);
  const n = normalizeOrigin(origin);
  for (const a of allowed) {
    if (normalizeOrigin(a) === n) return origin;
  }
  return null;
}

function jsonWithCors(
  req: NextRequest,
  data: NowPlayingResponse,
  status: number,
  extraHeaders?: Record<string, string>,
): NextResponse {
  const cors = corsOriginFor(req);
  const headers = new Headers(extraHeaders);
  if (cors) {
    headers.set('Access-Control-Allow-Origin', cors);
    headers.set('Vary', 'Origin');
  }
  return NextResponse.json(data, { status, headers });
}

export async function OPTIONS(req: NextRequest) {
  const cors = corsOriginFor(req);
  const headers = new Headers();
  if (cors) {
    headers.set('Access-Control-Allow-Origin', cors);
    headers.set('Vary', 'Origin');
  }
  headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type');
  headers.set('Access-Control-Max-Age', '86400');
  return new NextResponse(null, { status: 204, headers });
}

export async function GET(req: NextRequest) {
  const apiKey = process.env.LASTFM_API_KEY;
  const username = process.env.LASTFM_USERNAME;

  const empty: NowPlayingResponse = { isPlaying: false, track: null };

  if (!apiKey?.trim() || !username?.trim()) {
    return jsonWithCors(req, empty, 503);
  }

  try {
    const payload = await getPayload({ config });
    const kv = payload.kv;
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

    const res = await fetch(url.toString(), {
      method: 'GET',
      next: { revalidate: 0 },
    });

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
    console.error('Last.fm now-playing route error:', error);
    return jsonWithCors(req, empty, 500);
  }
}
