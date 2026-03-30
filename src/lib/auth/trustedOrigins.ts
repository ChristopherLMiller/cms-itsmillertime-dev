// src/lib/auth/trustedOrigins.ts
const STATIC_ORIGINS = process.env.TRUSTED_ORIGINS?.split(',').map((o) => o.trim()) || [];

export const trustedOriginsArray: string[] = STATIC_ORIGINS;

// For Better Auth — returns array from the request's origin
export function getTrustedOrigins(request?: Request): string[] {
  const origin = request ? new URL(request.url).origin : null;

  if (origin?.endsWith('.itsmillertime.dev')) {
    return [...STATIC_ORIGINS, origin];
  }

  return STATIC_ORIGINS;
}
