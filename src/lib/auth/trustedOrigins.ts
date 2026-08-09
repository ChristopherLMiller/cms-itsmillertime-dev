// src/lib/auth/trustedOrigins.ts

/** Strip trailing slashes — `https://*.itsmillertime.dev/` does not match origins. */
function normalizeOriginEntry(value: string): string {
  return value.trim().replace(/\/+$/, '');
}

const STATIC_ORIGINS = (process.env.TRUSTED_ORIGINS?.split(',') ?? [])
  .map(normalizeOriginEntry)
  .filter(Boolean);

export const trustedOriginsArray: string[] = STATIC_ORIGINS;

function forwardedOrigin(request?: Request): string | null {
  if (!request) return null;
  const host =
    request.headers.get('x-forwarded-host')?.split(',')[0]?.trim() ||
    request.headers.get('host')?.split(',')[0]?.trim();
  if (!host) {
    try {
      return new URL(request.url).origin;
    } catch {
      return null;
    }
  }
  const proto =
    request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim() ||
    (host.startsWith('localhost') || host.startsWith('127.0.0.1') ? 'http' : 'https');
  return `${proto}://${host}`;
}

// For Better Auth — returns array from the request's browser-facing origin
export function getTrustedOrigins(request?: Request): string[] {
  const origin = forwardedOrigin(request);

  if (origin) {
    try {
      const host = new URL(origin).hostname;
      if (host === 'itsmillertime.dev' || host.endsWith('.itsmillertime.dev')) {
        return [...STATIC_ORIGINS, origin];
      }
    } catch {
      // fall through
    }
  }

  return STATIC_ORIGINS;
}
