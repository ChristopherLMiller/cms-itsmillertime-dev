import type { PayloadRequest } from 'payload';
import {
  cmsPublicOrigin,
  isAllowedReturnUrl,
} from '../lib/auth/frontend-oauth-urls';
import {
  createSessionTicket,
  readSessionCookie,
} from '../lib/auth/frontend-oauth-ticket';

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function continuePage(dest: string, message: string): Response {
  const safeDest = escapeHtml(dest);
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="referrer" content="no-referrer" />
  <meta http-equiv="refresh" content="0;url=${safeDest}" />
  <title>Signing you in…</title>
  <style>
    body { font-family: system-ui, sans-serif; display: flex; justify-content: center; padding: 3rem; }
    a { color: inherit; }
  </style>
</head>
<body>
  <p>${escapeHtml(message)} <a href="${safeDest}">Continue</a></p>
  <script>location.replace(${JSON.stringify(dest)});</script>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'Referrer-Policy': 'no-referrer',
    },
  });
}

/**
 * Same-origin landing after Authentik so the CMS session cookie is committed,
 * then redirect to the frontend with a short-lived ticket. www exchanges that
 * ticket and sets a first-party session cookie (mobile Chrome/Safari drop
 * Domain= cookies set on a cross-origin 302 from cms → www).
 */
export async function frontendOauthContinueHandler(req: PayloadRequest): Promise<Response> {
  if (req.method !== 'GET') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const requestUrl = new URL(req.url || '/', cmsPublicOrigin());
  const to = requestUrl.searchParams.get('to')?.trim();
  const errorUrl = requestUrl.searchParams.get('error')?.trim();
  const request = req as unknown as Request;

  if (!to || !isAllowedReturnUrl(to, request)) {
    return Response.json({ error: 'Invalid destination' }, { status: 400 });
  }
  if (errorUrl && !isAllowedReturnUrl(errorUrl, request)) {
    return Response.json({ error: 'Invalid error destination' }, { status: 400 });
  }

  const failDest = errorUrl || to;
  const sessionCookie = readSessionCookie(req.headers.get('cookie'));
  if (!sessionCookie) {
    const dest = new URL(failDest);
    dest.searchParams.set('error', 'unable_to_create_session');
    return continuePage(dest.toString(), 'Sign-in did not complete.');
  }

  try {
    const ticket = createSessionTicket(sessionCookie);
    const dest = new URL(to);
    dest.searchParams.set('ticket', ticket);
    return continuePage(dest.toString(), 'Signing you in…');
  } catch (error) {
    console.error('[frontend-oauth-continue]', error);
    const dest = new URL(failDest);
    dest.searchParams.set('error', 'unable_to_create_session');
    return continuePage(dest.toString(), 'Sign-in did not complete.');
  }
}
