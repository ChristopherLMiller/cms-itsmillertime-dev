import { AUTHENTIK_PROVIDER_ID } from './authentik-constants';

export { AUTHENTIK_PROVIDER_ID };

export type AuthentikOAuthConfig = {
  providerId: typeof AUTHENTIK_PROVIDER_ID;
  clientId: string;
  clientSecret: string;
  discoveryUrl: string;
  scopes: string[];
  pkce: boolean;
  /**
   * OIDC redirect_uri. Prefer the www frontend proxy callback so Set-Cookie is
   * rewritten onto the site origin (cms-direct callbacks leave the session on cms).
   */
  redirectURI?: string;
};

function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

/**
 * Where Authentik should return after consent.
 * Prefer www `/api/auth/...` so the SvelteKit auth proxy sets the session cookie.
 */
export function getAuthentikRedirectURI(): string | undefined {
  const explicit = process.env.AUTHENTIK_REDIRECT_URI?.trim();
  if (explicit) return explicit;

  const frontend = process.env.NEXT_PUBLIC_FRONTEND_URL?.trim();
  if (frontend) {
    return `${stripTrailingSlash(frontend)}/api/auth/oauth2/callback/authentik`;
  }

  return undefined;
}

/**
 * Returns Authentik OIDC config when env is complete; otherwise null so local
 * break-glass login still works before the Authentik app is created.
 */
export function getAuthentikOAuthConfig(): AuthentikOAuthConfig | null {
  const clientId = process.env.AUTHENTIK_CLIENT_ID?.trim();
  const clientSecret = process.env.AUTHENTIK_CLIENT_SECRET?.trim();
  const discoveryUrl = process.env.AUTHENTIK_DISCOVERY_URL?.trim();

  if (!clientId || !clientSecret || !discoveryUrl) {
    return null;
  }

  const redirectURI = getAuthentikRedirectURI();

  return {
    providerId: AUTHENTIK_PROVIDER_ID,
    clientId,
    clientSecret,
    discoveryUrl,
    scopes: ['openid', 'profile', 'email'],
    pkce: true,
    ...(redirectURI ? { redirectURI } : {}),
    // Do not set requireIssuerValidation: Authentik often omits RFC 9207 `iss`
    // on the authorization response, which Better Auth would reject as issuer_missing.
  };
}

export function isAuthentikConfigured(): boolean {
  return getAuthentikOAuthConfig() !== null;
}
