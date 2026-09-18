import { oauth1Header } from './oauth1';
import { fail, missing, readErrorBody, secret, type AnnounceAdapterResult, type AnnouncePayload } from './types';

/**
 * Tumblr text/link post via OAuth 1.0a.
 * `blogName` = blog hostname or name; credentials: apiKey/apiSecret + accessToken/refreshToken (token secret).
 */
export async function postTumblr(args: AnnouncePayload): Promise<AnnounceAdapterResult> {
  const blog = (args.destination.blogName || '').replace(/\.tumblr\.com$/i, '').trim();
  const consumerKey = secret(args.destination.apiKey) || args.destination.apiKey?.trim() || '';
  const consumerSecret = secret(args.destination.apiSecret);
  const token = secret(args.destination.accessToken);
  const tokenSecret = secret(args.destination.refreshToken);
  if (!blog || !consumerKey || !consumerSecret || !token || !tokenSecret) {
    return missing('blogName', 'apiKey', 'apiSecret', 'accessToken', 'refreshToken (token secret)');
  }

  const url = `https://api.tumblr.com/v2/blog/${encodeURIComponent(blog)}.tumblr.com/post`;
  const form = new URLSearchParams({
    type: 'link',
    title: args.title.slice(0, 200),
    url: args.url,
    description: args.content,
  });

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: oauth1Header({
        method: 'POST',
        url,
        consumerKey,
        consumerSecret,
        token,
        tokenSecret,
        extraParams: Object.fromEntries(form.entries()),
      }),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: form,
  });
  if (!res.ok) return fail(res.status, 'Tumblr post failed', await readErrorBody(res));
  return { ok: true, status: res.status };
}
