import { getBaseUrl } from './getBaseUrl';

/** Hosts that may appear on www-proxied or CMS-direct Better Auth requests. */
export const AUTH_ALLOWED_HOSTS: string[] = [
  'itsmillertime.dev',
  '*.itsmillertime.dev',
  'localhost',
  'localhost:*',
  '127.0.0.1',
  '127.0.0.1:*',
];

export function resolveAuthBaseUrl(): string {
  return getBaseUrl().replace(/\/+$/, '');
}

/**
 * Static BETTER_AUTH_URL ignores X-Forwarded-Host, so www-proxied OAuth always
 * built redirect_uri for cms. Dynamic config uses the browser host instead.
 */
export function getDynamicAuthBaseURL(): {
  allowedHosts: string[];
  protocol: 'auto';
  fallback: string;
} {
  return {
    allowedHosts: AUTH_ALLOWED_HOSTS,
    protocol: 'auto',
    fallback: resolveAuthBaseUrl(),
  };
}

export function crossSubDomainForBaseUrl(baseUrl: string): string | null {
  try {
    const host = new URL(baseUrl).hostname;
    return host === 'itsmillertime.dev' || host.endsWith('.itsmillertime.dev')
      ? '.itsmillertime.dev'
      : null;
  } catch {
    return null;
  }
}
