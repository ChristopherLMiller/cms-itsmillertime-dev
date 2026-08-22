import type { PayloadRequest } from 'payload';
import { AUTHENTIK_PROVIDER_ID } from '../lib/auth/authentik-constants';
import {
  cmsPublicOrigin,
  handoffCallbackURL,
  isAllowedReturnUrl,
} from '../lib/auth/frontend-oauth-urls';

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

/**
 * Start Authentik OAuth on the CMS origin (first-party cookies + cms redirect_uri),
 * then return the browser to the frontend via /api/frontend-oauth-continue so
 * the session cookie is committed on CMS before leaving for www.
 */
export async function frontendOauthStartHandler(req: PayloadRequest): Promise<Response> {
  if (req.method !== 'GET') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const requestUrl = new URL(req.url || '/', 'http://localhost');
  const callbackURL = requestUrl.searchParams.get('callbackURL')?.trim();
  const errorCallbackURL =
    requestUrl.searchParams.get('errorCallbackURL')?.trim() || callbackURL;
  const request = req as unknown as Request;

  if (!callbackURL || !isAllowedReturnUrl(callbackURL, request)) {
    return Response.json({ error: 'Invalid or missing callbackURL' }, { status: 400 });
  }
  if (
    errorCallbackURL &&
    !isAllowedReturnUrl(errorCallbackURL, request)
  ) {
    return Response.json({ error: 'Invalid errorCallbackURL' }, { status: 400 });
  }

  const auth = (req.payload as PayloadWithAuth).betterAuth;
  if (!auth?.api?.signInWithOAuth2) {
    return Response.json({ error: 'Auth not initialized' }, { status: 500 });
  }

  const oauthCallbackURL = handoffCallbackURL(
    callbackURL,
    cmsPublicOrigin(),
    errorCallbackURL || callbackURL,
  );

  try {
    const response = await auth.api.signInWithOAuth2({
      body: {
        providerId: AUTHENTIK_PROVIDER_ID,
        callbackURL: oauthCallbackURL,
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
