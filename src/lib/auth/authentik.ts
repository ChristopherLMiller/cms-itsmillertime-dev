import { AUTHENTIK_PROVIDER_ID } from './authentik-constants';

export { AUTHENTIK_PROVIDER_ID };

export type AuthentikOAuthConfig = {
  providerId: typeof AUTHENTIK_PROVIDER_ID;
  clientId: string;
  clientSecret: string;
  discoveryUrl: string;
  scopes: string[];
  pkce: boolean;
};

/**
 * Returns Authentik OIDC config when env is complete; otherwise null so local
 * break-glass login still works before the Authentik app is created.
 *
 * redirect_uri is left unset so Better Auth uses BETTER_AUTH_URL
 * (cms.itsmillertime.dev). Shared Domain=.itsmillertime.dev cookies keep the
 * session available on www after callback. Forcing a www redirect_uri breaks
 * Payload admin login (oauth state starts on cms, callback must match).
 */
export function getAuthentikOAuthConfig(): AuthentikOAuthConfig | null {
  const clientId = process.env.AUTHENTIK_CLIENT_ID?.trim();
  const clientSecret = process.env.AUTHENTIK_CLIENT_SECRET?.trim();
  const discoveryUrl = process.env.AUTHENTIK_DISCOVERY_URL?.trim();

  if (!clientId || !clientSecret || !discoveryUrl) {
    return null;
  }

  return {
    providerId: AUTHENTIK_PROVIDER_ID,
    clientId,
    clientSecret,
    discoveryUrl,
    scopes: ['openid', 'profile', 'email'],
    pkce: true,
    // Do not set requireIssuerValidation: Authentik often omits RFC 9207 `iss`
    // on the authorization response, which Better Auth would reject as issuer_missing.
  };
}

export function isAuthentikConfigured(): boolean {
  return getAuthentikOAuthConfig() !== null;
}
