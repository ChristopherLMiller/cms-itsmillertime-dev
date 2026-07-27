import { getTrustedOrigins } from '@/lib/auth/trustedOrigins';
import { NextRequest, NextResponse } from 'next/server';

function normalizeOrigin(o: string): string {
  return o.replace(/\/$/, '');
}

export function corsOriginFor(req: NextRequest): string | null {
  const origin = req.headers.get('origin');
  if (!origin) return null;

  const allowed = getTrustedOrigins(req);
  const n = normalizeOrigin(origin);
  for (const a of allowed) {
    if (normalizeOrigin(a) === n) return origin;
  }

  try {
    const host = new URL(origin).hostname;
    if (host === 'itsmillertime.dev' || host.endsWith('.itsmillertime.dev')) {
      return origin;
    }
  } catch {
    // ignore invalid Origin
  }

  return null;
}

export function withCors(
  req: NextRequest,
  response: NextResponse,
  methods: string[] = ['GET', 'POST', 'OPTIONS'],
): NextResponse {
  const cors = corsOriginFor(req);
  if (cors) {
    response.headers.set('Access-Control-Allow-Origin', cors);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Vary', 'Origin');
  }
  response.headers.set('Access-Control-Allow-Methods', methods.join(', '));
  response.headers.set(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, Cookie, X-Api-Key',
  );
  response.headers.set('Access-Control-Max-Age', '86400');
  return response;
}

export function corsPreflight(req: NextRequest, methods?: string[]): NextResponse {
  return withCors(req, new NextResponse(null, { status: 204 }), methods);
}
