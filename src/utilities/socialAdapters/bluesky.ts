import { fail, missing, readErrorBody, secret, type AnnounceAdapterResult, type AnnouncePayload } from './types';

type BlueskySession = {
  did: string;
  accessJwt: string;
};

async function createSession(
  handle: string,
  appPassword: string,
): Promise<BlueskySession | AnnounceAdapterResult> {
  const res = await fetch('https://bsky.social/xrpc/com.atproto.server.createSession', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: handle, password: appPassword }),
  });
  if (!res.ok) return fail(res.status, 'Bluesky login failed', await readErrorBody(res));
  const json = (await res.json()) as { did?: string; accessJwt?: string };
  if (!json.did || !json.accessJwt) {
    return { ok: false, error: 'Bluesky session missing did/accessJwt' };
  }
  return { did: json.did, accessJwt: json.accessJwt };
}

/** Facet for a URL span in Bluesky rich text (byte offsets). */
function linkFacet(text: string, linkUrl: string) {
  const encoder = new TextEncoder();
  const start = text.indexOf(linkUrl);
  if (start < 0) return null;
  const byteStart = encoder.encode(text.slice(0, start)).byteLength;
  const byteEnd = byteStart + encoder.encode(linkUrl).byteLength;
  return {
    index: { byteStart, byteEnd },
    features: [{ $type: 'app.bsky.richtext.facet#link', uri: linkUrl }],
  };
}

export async function postBluesky(args: AnnouncePayload): Promise<AnnounceAdapterResult> {
  const handle = (args.destination.handle || '').trim();
  const appPassword = secret(args.destination.appPassword);
  if (!handle || !appPassword) return missing('handle', 'appPassword');

  const session = await createSession(handle, appPassword);
  if ('ok' in session) return session;

  const text = args.content.slice(0, 300);
  const facet = linkFacet(text, args.url);
  const record: Record<string, unknown> = {
    $type: 'app.bsky.feed.post',
    text,
    createdAt: new Date().toISOString(),
    ...(facet ? { facets: [facet] } : {}),
  };

  const res = await fetch('https://bsky.social/xrpc/com.atproto.repo.createRecord', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.accessJwt}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      repo: session.did,
      collection: 'app.bsky.feed.post',
      record,
    }),
  });
  if (!res.ok) return fail(res.status, 'Bluesky post failed', await readErrorBody(res));
  return { ok: true, status: res.status };
}
