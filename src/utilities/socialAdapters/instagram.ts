import {
  fail,
  fetchOgImage,
  missing,
  readErrorBody,
  secret,
  type AnnounceAdapterResult,
  type AnnouncePayload,
} from './types';

/**
 * Instagram Content Publishing (Business / Creator).
 * Requires an image — uses Open Graph image from the public URL when available.
 * `pageId` = Instagram Business Account ID, `accessToken` = long-lived user/page token.
 */
export async function postInstagram(args: AnnouncePayload): Promise<AnnounceAdapterResult> {
  const igUserId = (args.destination.pageId || '').trim();
  const token = secret(args.destination.accessToken);
  if (!igUserId || !token) return missing('pageId (Instagram business account id)', 'accessToken');

  const imageUrl = await fetchOgImage(args.url);
  if (!imageUrl) {
    return {
      ok: false,
      retryable: false,
      error:
        'Instagram requires an image. Could not find og:image on the public URL — add SEO/meta image or post manually.',
    };
  }

  const caption = args.content.slice(0, 2200);
  const createRes = await fetch(
    `https://graph.facebook.com/v21.0/${encodeURIComponent(igUserId)}/media`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        image_url: imageUrl,
        caption,
        access_token: token,
      }),
    },
  );
  if (!createRes.ok) {
    return fail(createRes.status, 'Instagram media create failed', await readErrorBody(createRes));
  }
  const created = (await createRes.json()) as { id?: string };
  if (!created.id) return { ok: false, error: 'Instagram media create missing id' };

  const publishRes = await fetch(
    `https://graph.facebook.com/v21.0/${encodeURIComponent(igUserId)}/media_publish`,
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
    return fail(publishRes.status, 'Instagram publish failed', await readErrorBody(publishRes));
  }
  return { ok: true, status: publishRes.status };
}
