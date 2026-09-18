import { fail, missing, readErrorBody, secret, type AnnounceAdapterResult, type AnnouncePayload } from './types';

/**
 * LinkedIn Posts API (REST).
 * `pageId` = author URN, e.g. `urn:li:person:xxx` or `urn:li:organization:xxx`.
 * `accessToken` = OAuth 2 user/app token with w_member_social / w_organization_social.
 */
export async function postLinkedIn(args: AnnouncePayload): Promise<AnnounceAdapterResult> {
  const author = (args.destination.pageId || '').trim();
  const token = secret(args.destination.accessToken);
  if (!author || !token) return missing('pageId (author URN)', 'accessToken');

  const authorUrn = author.startsWith('urn:') ? author : `urn:li:organization:${author}`;

  const res = await fetch('https://api.linkedin.com/rest/posts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
      'LinkedIn-Version': '202401',
    },
    body: JSON.stringify({
      author: authorUrn,
      commentary: args.content,
      visibility: 'PUBLIC',
      distribution: {
        feedDistribution: 'MAIN_FEED',
        targetEntities: [],
        thirdPartyDistributionChannels: [],
      },
      content: {
        article: {
          source: args.url,
          title: args.title.slice(0, 200),
        },
      },
      lifecycleState: 'PUBLISHED',
      isReshareDisabledByAuthor: false,
    }),
  });

  if (!res.ok) {
    const restErr = await readErrorBody(res);
    // Fallback to legacy UGC Posts if REST posts fails (common with older tokens).
    const legacy = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify({
        author: authorUrn,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: { text: args.content },
            shareMediaCategory: 'ARTICLE',
            media: [
              {
                status: 'READY',
                originalUrl: args.url,
                title: { text: args.title.slice(0, 200) },
              },
            ],
          },
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
        },
      }),
    });
    if (!legacy.ok) {
      const legacyErr = await readErrorBody(legacy);
      return {
        ok: false,
        status: legacy.status,
        error: `LinkedIn post failed. REST: ${restErr} | UGC: ${legacyErr}`,
      };
    }
    return { ok: true, status: legacy.status };
  }

  return { ok: true, status: res.status };
}
