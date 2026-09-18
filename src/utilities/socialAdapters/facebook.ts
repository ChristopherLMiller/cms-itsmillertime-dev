import { fail, missing, readErrorBody, secret, type AnnounceAdapterResult, type AnnouncePayload } from './types';

/** Post to a Facebook Page feed. `pageId` = Page ID, `accessToken` = Page access token. */
export async function postFacebook(args: AnnouncePayload): Promise<AnnounceAdapterResult> {
  const pageId = (args.destination.pageId || '').trim();
  const token = secret(args.destination.accessToken);
  if (!pageId || !token) return missing('pageId', 'accessToken');

  const form = new URLSearchParams({
    message: args.content,
    link: args.url,
    access_token: token,
  });

  const res = await fetch(`https://graph.facebook.com/v21.0/${encodeURIComponent(pageId)}/feed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form,
  });
  if (!res.ok) return fail(res.status, 'Facebook Page post failed', await readErrorBody(res));
  return { ok: true, status: res.status };
}
