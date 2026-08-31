import type { GenericOAuthConfig } from 'better-auth/plugins';
import { AUTHENTIK_PROVIDER_ID } from './authentik-constants';
import { fetchAuthentikOAuthUserInfo } from './authentik-role-sync';

export { AUTHENTIK_PROVIDER_ID };

export type AuthentikOAuthConfig = GenericOAuthConfig;

/**
 * Returns Authentik OIDC config when env is complete; otherwise null so local
 * break-glass login still works before the Authentik app is created.
 *
 * redirect_uri is left unset so Better Auth builds it from the request base URL.
 * www login proxies /api/auth with X-Forwarded-Host=www (dynamic baseURL), so
 * Authentik returns to www. Admin login on cms has no www forwarded host, so
 * the callback stays on cms.
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
    getUserInfo: async (tokens) => fetchAuthentikOAuthUserInfo(tokens, discoveryUrl),
    // Do not set requireIssuerValidation: Authentik often omits RFC 9207 `iss`
    // on the authorization response, which Better Auth would reject as issuer_missing.
  };
}

export function isAuthentikConfigured(): boolean {
  return getAuthentikOAuthConfig() !== null;
}
