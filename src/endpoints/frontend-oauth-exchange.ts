import type { PayloadRequest } from 'payload';
import { openSessionTicket } from '../lib/auth/frontend-oauth-ticket';

/**
 * www POSTs the continue-page ticket and receives the session cookie to set
 * first-party on the site origin. Ticket TTL is 90s.
 */
export async function frontendOauthExchangeHandler(req: PayloadRequest): Promise<Response> {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const parseJson = req.json;
  if (!parseJson) {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await parseJson.call(req);
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const ticket =
    body && typeof body === 'object' && !Array.isArray(body)
      ? (body as { ticket?: unknown }).ticket
      : undefined;
  if (typeof ticket !== 'string' || !ticket) {
    return Response.json({ error: 'Missing ticket' }, { status: 400 });
  }

  const payload = openSessionTicket(ticket);
  if (!payload) {
    return Response.json({ error: 'Invalid or expired ticket' }, { status: 400 });
  }

  return Response.json({
    name: payload.name,
    value: payload.value,
    maxAge: 60 * 60 * 24 * 30,
  });
}
