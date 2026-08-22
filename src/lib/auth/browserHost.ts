export const AUTH_BROWSER_HOST_HEADER = 'x-auth-browser-host';
export const AUTH_BROWSER_PROTO_HEADER = 'x-auth-browser-proto';

const ALLOWED_BROWSER_HOST =
  /^(?:[a-z0-9-]+\.)*itsmillertime\.dev(?::\d+)?$|^(?:localhost|127\.0\.0\.1)(?::\d+)?$/i;

export function isAllowedAuthBrowserHost(host: string): boolean {
  return ALLOWED_BROWSER_HOST.test(host.trim());
}
