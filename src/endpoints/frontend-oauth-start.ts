import type { PayloadRequest } from 'payload';
import { AUTHENTIK_PROVIDER_ID } from '../lib/auth/authentik-constants';
import { getTrustedOrigins } from '../lib/auth/trustedOrigins';

type PayloadWithAuth = PayloadRequest['payload'] & {
  betterAuth?: {
    api: {
      signInWithOAuth2: (args: {
        body: {
          providerId: string;
          callbackURL: string;
          errorCallbackURL?: string;
        };
        headers: Headers;
        asResponse: true;
      }) => Promise<Response>;
    };
  };
};

function isAllowedReturnUrl(raw: string, request: Request): boolean {
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

/**
 * Start Authentik OAuth on the CMS origin (first-party cookies + cms redirect_uri),
 * then return the browser to the frontend callbackURL after Authentik completes.
 *
 * Used by www login so state/session cookies are not split across www proxy + cms callback.
 */
export async function frontendOauthStartHandler(req: PayloadRequest): Promise<Response> {
  if (req.method !== 'GET') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const requestUrl = new URL(req.url || '/', 'http://localhost');
  const callbackURL = requestUrl.searchParams.get('callbackURL')?.trim();
  const errorCallbackURL =
    requestUrl.searchParams.get('errorCallbackURL')?.trim() || callbackURL;

  if (!callbackURL || !isAllowedReturnUrl(callbackURL, req as unknown as Request)) {
    return Response.json({ error: 'Invalid or missing callbackURL' }, { status: 400 });
  }
  if (
    errorCallbackURL &&
    !isAllowedReturnUrl(errorCallbackURL, req as unknown as Request)
  ) {
    return Response.json({ error: 'Invalid errorCallbackURL' }, { status: 400 });
  }

  const auth = (req.payload as PayloadWithAuth).betterAuth;
  if (!auth?.api?.signInWithOAuth2) {
    return Response.json({ error: 'Auth not initialized' }, { status: 500 });
  }

  try {
    const response = await auth.api.signInWithOAuth2({
      body: {
        providerId: AUTHENTIK_PROVIDER_ID,
        callbackURL,
        errorCallbackURL: errorCallbackURL || callbackURL,
      },
      headers: req.headers,
      asResponse: true,
    });

    if (response.status >= 300 && response.status < 400) {
      return response;
    }

    const setCookies =
      typeof response.headers.getSetCookie === 'function'
        ? response.headers.getSetCookie()
        : [];

    const data = (await response.json().catch(() => null)) as {
      url?: string;
      redirect?: boolean;
    } | null;

    if (data?.url) {
      const headers = new Headers({ Location: data.url });
      for (const cookie of setCookies) {
        headers.append('Set-Cookie', cookie);
      }
      return new Response(null, { status: 302, headers });
    }

    return Response.json(
      { error: 'Failed to start Authentik sign-in' },
      { status: 502 },
    );
  } catch (error) {
    console.error('[frontend-oauth-start]', error);
    return Response.json({ error: 'Failed to start Authentik sign-in' }, { status: 500 });
  }
}
