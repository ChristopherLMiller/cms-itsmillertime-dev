import { fail, missing, readErrorBody, secret, type AnnounceAdapterResult, type AnnouncePayload } from './types';

/**
 * Meta Threads API — text post.
 * `pageId` = Threads user id, `accessToken` = Threads/Graph token.
 */
export async function postThreads(args: AnnouncePayload): Promise<AnnounceAdapterResult> {
  const userId = (args.destination.pageId || args.destination.handle || '').trim();
  const token = secret(args.destination.accessToken);
  if (!userId || !token) return missing('pageId (Threads user id)', 'accessToken');

  const createRes = await fetch(
    `https://graph.threads.net/v1.0/${encodeURIComponent(userId)}/threads`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        media_type: 'TEXT',
        text: args.content.slice(0, 500),
        access_token: token,
      }),
    },
  );
  if (!createRes.ok) {
    return fail(createRes.status, 'Threads create failed', await readErrorBody(createRes));
  }
  const created = (await createRes.json()) as { id?: string };
  if (!created.id) return { ok: false, error: 'Threads create missing id' };

  const publishRes = await fetch(
    `https://graph.threads.net/v1.0/${encodeURIComponent(userId)}/threads_publish`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        creation_id: created.id,
        access_token: token,
      }),
    },
  );
  if (!publishRes.ok) {
    return fail(publishRes.status, 'Threads publish failed', await readErrorBody(publishRes));
  }
  return { ok: true, status: publishRes.status };
}
