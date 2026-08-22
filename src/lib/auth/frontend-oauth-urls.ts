import { getTrustedOrigins } from './trustedOrigins';
import { getBaseUrl } from './getBaseUrl';

export function isAllowedReturnUrl(raw: string, request: Request): boolean {
  try {
    const target = new URL(raw);
    if (target.protocol !== 'https:' && target.protocol !== 'http:') return false;

    const allowed = new Set(getTrustedOrigins(request));
    if (allowed.has(target.origin)) return true;

    const host = target.hostname;
    if (host === 'itsmillertime.dev' || host.endsWith('.itsmillertime.dev')) return true;
    if (host === 'localhost' || host === '127.0.0.1') return true;

    return false;
  } catch {
    return false;
  }
}

/** Public CMS origin (BETTER_AUTH_URL). Do not use req.url — proxy internals are private. */
export function cmsPublicOrigin(): string {
  return getBaseUrl().replace(/\/+$/, '');
}

/**
 * After Authentik, Better Auth 302s to callbackURL with Set-Cookie.
 * If that Location is another origin (www), mobile Chrome/Safari often drop the cookie.
 * Stay on CMS first so the session cookie is committed, then hand off.
 */
export function handoffCallbackURL(
  frontendCallbackURL: string,
  cmsOrigin: string,
  errorCallbackURL?: string,
): string {
  const frontend = new URL(frontendCallbackURL);
  const cms = new URL(cmsOrigin);
  if (frontend.origin === cms.origin) return frontendCallbackURL;

  const continueUrl = new URL('/api/frontend-oauth-continue', cms.origin);
  continueUrl.searchParams.set('to', frontendCallbackURL);
  if (errorCallbackURL) {
    continueUrl.searchParams.set('error', errorCallbackURL);
  }
  return continueUrl.toString();
}
