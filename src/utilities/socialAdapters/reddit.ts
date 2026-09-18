import { fail, missing, readErrorBody, secret, type AnnounceAdapterResult, type AnnouncePayload } from './types';

async function redditAccessToken(destination: AnnouncePayload['destination']): Promise<
  { token: string } | AnnounceAdapterResult
> {
  const clientId = secret(destination.clientId) || destination.clientId?.trim() || '';
  const clientSecret = secret(destination.clientSecret);
  const refreshToken = secret(destination.refreshToken);
  if (!clientId || !clientSecret || !refreshToken) {
    return missing('clientId', 'clientSecret', 'refreshToken');
  }

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });

  const res = await fetch('https://www.reddit.com/api/v1/access_token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'ItsMillerTimeCMS/1.0',
    },
    body,
  });
  if (!res.ok) return fail(res.status, 'Reddit token refresh failed', await readErrorBody(res));
  const json = (await res.json()) as { access_token?: string };
  if (!json.access_token) return { ok: false, error: 'Reddit token response missing access_token' };
  return { token: json.access_token };
}

/** Submit a link post to a subreddit. */
export async function postReddit(args: AnnouncePayload): Promise<AnnounceAdapterResult> {
  const subreddit = (args.destination.subreddit || '').replace(/^r\//i, '').trim();
  if (!subreddit) return missing('subreddit');

  const tokenResult = await redditAccessToken(args.destination);
  if ('ok' in tokenResult) return tokenResult;

  const form = new URLSearchParams({
    api_type: 'json',
    kind: 'link',
    sr: subreddit,
    title: args.title.slice(0, 300),
    url: args.url,
    resubmit: 'true',
  });

  const res = await fetch('https://oauth.reddit.com/api/submit', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokenResult.token}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'ItsMillerTimeCMS/1.0',
    },
    body: form,
  });
  if (!res.ok) return fail(res.status, 'Reddit submit failed', await readErrorBody(res));

  const json = (await res.json().catch(() => null)) as
    | { json?: { errors?: unknown[] } }
    | null;
  const errors = json?.json?.errors;
  if (Array.isArray(errors) && errors.length > 0) {
    return { ok: false, error: `Reddit submit errors: ${JSON.stringify(errors).slice(0, 300)}` };
  }
  return { ok: true, status: res.status };
}
