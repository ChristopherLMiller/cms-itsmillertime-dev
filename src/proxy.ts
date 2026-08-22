import { NextRequest, NextResponse } from 'next/server';
import {
  AUTH_BROWSER_HOST_HEADER,
  AUTH_BROWSER_PROTO_HEADER,
  isAllowedAuthBrowserHost,
} from '@/lib/auth/browserHost';

/**
 * Cloudflare / Coolify overwrite X-Forwarded-Host to cms when www proxies
 * /api/auth over the public CMS URL. Restore the browser host from a header
 * they do not touch so Better Auth can build redirect_uri for www.
 */
export function proxy(request: NextRequest) {
  const browserHost = request.headers.get(AUTH_BROWSER_HOST_HEADER)?.split(',')[0]?.trim();
  if (!browserHost || !isAllowedAuthBrowserHost(browserHost)) {
    return NextResponse.next();
  }

  const headers = new Headers(request.headers);
  headers.set('x-forwarded-host', browserHost);

  const proto = request.headers.get(AUTH_BROWSER_PROTO_HEADER)?.split(',')[0]?.trim();
  if (proto === 'http' || proto === 'https') {
    headers.set('x-forwarded-proto', proto);
  }

  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: '/api/auth/:path*',
};
