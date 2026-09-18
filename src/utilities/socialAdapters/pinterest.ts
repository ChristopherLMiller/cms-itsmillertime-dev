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
 * Pinterest v5 create pin.
 * `boardId` required; `accessToken` = OAuth bearer.
 * Uses og:image from the public URL when available.
 */
export async function postPinterest(args: AnnouncePayload): Promise<AnnounceAdapterResult> {
  const boardId = (args.destination.boardId || '').trim();
  const token = secret(args.destination.accessToken);
  if (!boardId || !token) return missing('boardId', 'accessToken');

  const imageUrl = await fetchOgImage(args.url);
  if (!imageUrl) {
    return {
      ok: false,
      retryable: false,
      error:
        'Pinterest requires an image. Could not find og:image on the public URL — set a featured/meta image first.',
    };
  }

  const res = await fetch('https://api.pinterest.com/v5/pins', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      board_id: boardId,
      title: args.title.slice(0, 100),
      description: args.content.slice(0, 800),
      link: args.url,
      media_source: {
        source_type: 'image_url',
        url: imageUrl,
      },
    }),
  });
  if (!res.ok) return fail(res.status, 'Pinterest pin failed', await readErrorBody(res));
  return { ok: true, status: res.status };
}
