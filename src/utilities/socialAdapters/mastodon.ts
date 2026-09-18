import { fail, missing, readErrorBody, secret, type AnnounceAdapterResult, type AnnouncePayload } from './types';

export async function postMastodon(args: AnnouncePayload): Promise<AnnounceAdapterResult> {
  const instanceUrl = (args.destination.instanceUrl || '').replace(/\/+$/, '');
  const token =
    secret(args.destination.accessToken) ||
    secret(args.destination.bearerToken);
  if (!instanceUrl || !token) return missing('instanceUrl', 'accessToken');

  const res = await fetch(`${instanceUrl}/api/v1/statuses`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      status: args.content,
      visibility: 'public',
    }),
  });
  if (!res.ok) return fail(res.status, 'Mastodon status failed', await readErrorBody(res));
  return { ok: true, status: res.status };
}
