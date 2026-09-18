import { oauth1Header } from './oauth1';
import { fail, missing, readErrorBody, secret, type AnnounceAdapterResult, type AnnouncePayload } from './types';

/**
 * Post a tweet via X API v2.
 * Prefers OAuth 2.0 user bearer (`accessToken`).
 * Falls back to OAuth 1.0a when apiKey/apiSecret/accessToken/refreshToken (token secret) are set.
 */
export async function postX(args: AnnouncePayload): Promise<AnnounceAdapterResult> {
  const text = args.content.slice(0, 280);
  const url = 'https://api.twitter.com/2/tweets';
  const body = JSON.stringify({ text });

  const bearer = secret(args.destination.accessToken) || secret(args.destination.bearerToken);
  const consumerKey = secret(args.destination.apiKey) || args.destination.apiKey?.trim() || '';
  const consumerSecret = secret(args.destination.apiSecret);
  const tokenSecret = secret(args.destination.refreshToken);

  let headers: Record<string, string>;

  if (consumerKey && consumerSecret && bearer && tokenSecret) {
    headers = {
      Authorization: oauth1Header({
        method: 'POST',
        url,
        consumerKey,
        consumerSecret,
        token: bearer,
        tokenSecret,
      }),
      'Content-Type': 'application/json',
    };
  } else if (bearer) {
    headers = {
      Authorization: `Bearer ${bearer}`,
      'Content-Type': 'application/json',
    };
  } else {
    return missing('accessToken (OAuth 2 user token) — or apiKey + apiSecret + accessToken + refreshToken (OAuth 1.0a token secret)');
  }

  const res = await fetch(url, { method: 'POST', headers, body });
  if (!res.ok) return fail(res.status, 'X (Twitter) post failed', await readErrorBody(res));
  return { ok: true, status: res.status };
}
