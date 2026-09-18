import { allowedRoles } from '@/access/methods/allowedRoles';
import { encryptSecret } from '@/lib/settings-encryption';
import type { SocialDestinationRow } from '@/utilities/socialAdapters';
import { secret } from '@/utilities/socialAdapters/types';
import { getPlatformSetupGuide } from '@/utilities/socialDestinationGuides';
import {
  createPkcePair,
  decodeOauthState,
  encodeOauthState,
  socialOauthCallbackUrl,
} from '@/utilities/socialOauthState';
import type { SocialPlatformType } from '@/utilities/socialPlatforms';
import { cmsBaseUrl } from '@/utilities/productRequestUrls';
import type { PayloadRequest } from 'payload';

async function requireAdmin(req: PayloadRequest): Promise<boolean> {
  return allowedRoles(['admin'])({ req });
}

function adminReturnUrl(opts: { ok?: boolean; error?: string; type?: string }): string {
  const base = `${cmsBaseUrl()}/admin/globals/social-destinations`;
  const params = new URLSearchParams();
  if (opts.ok) params.set('oauth', 'success');
  if (opts.error) params.set('oauthError', opts.error.slice(0, 180));
  if (opts.type) params.set('oauthType', opts.type);
  const q = params.toString();
  return q ? `${base}?${q}` : base;
}

function redirect(url: string): Response {
  return Response.redirect(url, 302);
}

function normalizeInstanceUrl(raw: string): string | null {
  const trimmed = raw.trim().replace(/\/+$/, '');
  if (!trimmed) return null;
  try {
    const u = new URL(trimmed.includes('://') ? trimmed : `https://${trimmed}`);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
    return `${u.protocol}//${u.host}`;
  } catch {
    return null;
  }
}

async function loadDestination(
  req: PayloadRequest,
  destinationId: string,
): Promise<{ row: SocialDestinationRow; all: SocialDestinationRow[] } | null> {
  const globalDoc = await req.payload.findGlobal({
    slug: 'social-destinations',
    overrideAccess: true,
    depth: 0,
  });
  const all = Array.isArray(globalDoc?.destinations)
    ? (globalDoc.destinations as SocialDestinationRow[])
    : [];
  const row = all.find((r) => r?.id === destinationId);
  if (!row) return null;
  return { row, all };
}

async function saveDestinationPatch(
  req: PayloadRequest,
  destinationId: string,
  patch: Partial<SocialDestinationRow>,
): Promise<void> {
  const loaded = await loadDestination(req, destinationId);
  if (!loaded) throw new Error('Destination not found');

  const next = loaded.all.map((row) => {
    if (row?.id !== destinationId) return row;
    const merged = { ...row, ...patch };
    for (const key of [
      'webhookUrl',
      'clientSecret',
      'accessToken',
      'refreshToken',
      'apiKey',
      'apiSecret',
      'appPassword',
      'botToken',
      'bearerToken',
    ] as const) {
      const val = merged[key];
      if (typeof val === 'string' && val.trim() && !val.startsWith('enc:v1:')) {
        try {
          merged[key] = encryptSecret(val.trim());
        } catch {
          // leave as-is; global beforeChange will also encrypt on next save
        }
      }
    }
    return merged;
  });

  await req.payload.updateGlobal({
    slug: 'social-destinations',
    data: { destinations: next as never },
    overrideAccess: true,
  });
}

/** GET /api/social-destinations/oauth/callback-url — for the setup UI copy box. */
export async function socialOauthCallbackUrlHandler(req: PayloadRequest): Promise<Response> {
  if (req.method !== 'GET') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }
  if (!(await requireAdmin(req))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return Response.json({ callbackUrl: socialOauthCallbackUrl() });
}

/**
 * GET /api/social-destinations/oauth/start?destinationId=&type=
 * Starts platform OAuth using credentials already saved on the destination row.
 */
export async function socialOauthStartHandler(req: PayloadRequest): Promise<Response> {
  if (req.method !== 'GET') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }
  if (!(await requireAdmin(req))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url || '/', 'http://localhost');
  const destinationId = url.searchParams.get('destinationId')?.trim() || '';
  const type = (url.searchParams.get('type')?.trim() || '') as SocialPlatformType;
  if (!destinationId || !type) {
    return Response.json({ error: 'destinationId and type are required' }, { status: 400 });
  }

  const guide = getPlatformSetupGuide(type);
  if (!guide?.oauth) {
    return Response.json({ error: `OAuth is not available for ${type}` }, { status: 400 });
  }

  const loaded = await loadDestination(req, destinationId);
  if (!loaded) {
    return Response.json(
      { error: 'Destination not found. Save Social Destinations first.' },
      { status: 404 },
    );
  }
  if (loaded.row.type !== type) {
    return Response.json({ error: 'Destination type mismatch — save the form first.' }, { status: 409 });
  }

  const callback = socialOauthCallbackUrl();
  const clientId = (secret(loaded.row.clientId) || loaded.row.clientId || '').trim();
  const clientSecret = secret(loaded.row.clientSecret);

  try {
    switch (type) {
      case 'reddit': {
        if (!clientId || !clientSecret) {
          return Response.json({ error: 'Save clientId and clientSecret first' }, { status: 400 });
        }
        const state = encodeOauthState({ destinationId, type });
        const auth = new URL('https://www.reddit.com/api/v1/authorize');
        auth.searchParams.set('client_id', clientId);
        auth.searchParams.set('response_type', 'code');
        auth.searchParams.set('state', state);
        auth.searchParams.set('redirect_uri', callback);
        auth.searchParams.set('duration', 'permanent');
        auth.searchParams.set('scope', 'submit identity');
        return redirect(auth.toString());
      }
      case 'mastodon': {
        const instanceUrl = normalizeInstanceUrl(loaded.row.instanceUrl || '');
        if (!instanceUrl) {
          return Response.json({ error: 'Save a valid instanceUrl first' }, { status: 400 });
        }
        // Register an app on the instance when we don't already have client credentials.
        let appClientId = clientId;
        let appClientSecret = clientSecret;
        if (!appClientId || !appClientSecret) {
          const createRes = await fetch(`${instanceUrl}/api/v1/apps`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              client_name: 'ItsMillerTime CMS',
              redirect_uris: callback,
              scopes: 'write:statuses read:accounts',
              website: cmsBaseUrl(),
            }),
          });
          if (!createRes.ok) {
            const body = await createRes.text().catch(() => '');
            return Response.json(
              { error: `Mastodon app registration failed (${createRes.status}): ${body.slice(0, 200)}` },
              { status: 502 },
            );
          }
          const app = (await createRes.json()) as {
            client_id?: string;
            client_secret?: string;
          };
          if (!app.client_id || !app.client_secret) {
            return Response.json({ error: 'Mastodon app response missing client credentials' }, { status: 502 });
          }
          appClientId = app.client_id;
          appClientSecret = app.client_secret;
          await saveDestinationPatch(req, destinationId, {
            clientId: appClientId,
            clientSecret: appClientSecret,
            instanceUrl,
          });
        }
        const state = encodeOauthState({
          destinationId,
          type,
          instanceUrl,
          clientId: appClientId,
          clientSecret: appClientSecret,
        });
        const auth = new URL(`${instanceUrl}/oauth/authorize`);
        auth.searchParams.set('client_id', appClientId);
        auth.searchParams.set('scope', 'write:statuses read:accounts');
        auth.searchParams.set('redirect_uri', callback);
        auth.searchParams.set('response_type', 'code');
        auth.searchParams.set('state', state);
        return redirect(auth.toString());
      }
      case 'linkedin': {
        if (!clientId || !clientSecret) {
          return Response.json({ error: 'Save clientId and clientSecret first' }, { status: 400 });
        }
        const state = encodeOauthState({ destinationId, type });
        const auth = new URL('https://www.linkedin.com/oauth/v2/authorization');
        auth.searchParams.set('response_type', 'code');
        auth.searchParams.set('client_id', clientId);
        auth.searchParams.set('redirect_uri', callback);
        auth.searchParams.set('state', state);
        auth.searchParams.set('scope', 'openid profile w_member_social');
        return redirect(auth.toString());
      }
      case 'pinterest': {
        if (!clientId || !clientSecret) {
          return Response.json({ error: 'Save clientId and clientSecret first' }, { status: 400 });
        }
        const { verifier, challenge } = createPkcePair();
        const state = encodeOauthState({ destinationId, type, codeVerifier: verifier });
        const auth = new URL('https://www.pinterest.com/oauth/');
        auth.searchParams.set('client_id', clientId);
        auth.searchParams.set('redirect_uri', callback);
        auth.searchParams.set('response_type', 'code');
        auth.searchParams.set('scope', 'boards:read,pins:write,pins:read');
        auth.searchParams.set('state', state);
        auth.searchParams.set('code_challenge', challenge);
        auth.searchParams.set('code_challenge_method', 'S256');
        return redirect(auth.toString());
      }
      case 'x': {
        if (!clientId || !clientSecret) {
          return Response.json({ error: 'Save clientId and clientSecret first' }, { status: 400 });
        }
        const { verifier, challenge } = createPkcePair();
        const state = encodeOauthState({ destinationId, type, codeVerifier: verifier });
        const auth = new URL('https://twitter.com/i/oauth2/authorize');
        auth.searchParams.set('response_type', 'code');
        auth.searchParams.set('client_id', clientId);
        auth.searchParams.set('redirect_uri', callback);
        auth.searchParams.set('scope', 'tweet.read tweet.write users.read offline.access');
        auth.searchParams.set('state', state);
        auth.searchParams.set('code_challenge', challenge);
        auth.searchParams.set('code_challenge_method', 'S256');
        return redirect(auth.toString());
      }
      default:
        return Response.json({ error: `OAuth start not implemented for ${type}` }, { status: 400 });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'OAuth start failed';
    return Response.json({ error: message }, { status: 500 });
  }
}

/** GET /api/social-destinations/oauth/callback */
export async function socialOauthCallbackHandler(req: PayloadRequest): Promise<Response> {
  if (req.method !== 'GET') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }
  // Callback may arrive without cookies in some browsers; still require admin session.
  if (!(await requireAdmin(req))) {
    return redirect(adminReturnUrl({ error: 'Unauthorized — sign in to the CMS admin and retry Authorize.' }));
  }

  const url = new URL(req.url || '/', 'http://localhost');
  const errParam = url.searchParams.get('error');
  const errDesc = url.searchParams.get('error_description');
  if (errParam) {
    return redirect(
      adminReturnUrl({ error: errDesc || errParam, type: url.searchParams.get('state') || undefined }),
    );
  }

  const code = url.searchParams.get('code')?.trim() || '';
  const stateRaw = url.searchParams.get('state')?.trim() || '';
  const pending = decodeOauthState(stateRaw);
  if (!code || !pending) {
    return redirect(adminReturnUrl({ error: 'Invalid or expired OAuth state. Try Authorize again.' }));
  }

  const callback = socialOauthCallbackUrl();
  const loaded = await loadDestination(req, pending.destinationId);
  if (!loaded) {
    return redirect(adminReturnUrl({ error: 'Destination disappeared before OAuth completed.', type: pending.type }));
  }

  const clientId =
    pending.clientId ||
    (secret(loaded.row.clientId) || loaded.row.clientId || '').trim();
  const clientSecret = pending.clientSecret || secret(loaded.row.clientSecret);

  try {
    switch (pending.type) {
      case 'reddit': {
        if (!clientId || !clientSecret) {
          return redirect(adminReturnUrl({ error: 'Missing Reddit client credentials', type: 'reddit' }));
        }
        const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
        const tokenRes = await fetch('https://www.reddit.com/api/v1/access_token', {
          method: 'POST',
          headers: {
            Authorization: `Basic ${basic}`,
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'ItsMillerTimeCMS/1.0',
          },
          body: new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            redirect_uri: callback,
          }),
        });
        if (!tokenRes.ok) {
          const body = await tokenRes.text().catch(() => '');
          return redirect(
            adminReturnUrl({
              error: `Reddit token exchange failed (${tokenRes.status}): ${body.slice(0, 120)}`,
              type: 'reddit',
            }),
          );
        }
        const json = (await tokenRes.json()) as {
          refresh_token?: string;
          access_token?: string;
        };
        if (!json.refresh_token) {
          return redirect(
            adminReturnUrl({
              error: 'Reddit did not return a refresh_token (app must be type script + duration=permanent).',
              type: 'reddit',
            }),
          );
        }
        await saveDestinationPatch(req, pending.destinationId, {
          refreshToken: json.refresh_token,
          ...(json.access_token ? { accessToken: json.access_token } : {}),
        });
        return redirect(adminReturnUrl({ ok: true, type: 'reddit' }));
      }
      case 'mastodon': {
        const instanceUrl =
          pending.instanceUrl || normalizeInstanceUrl(loaded.row.instanceUrl || '') || '';
        if (!instanceUrl || !clientId || !clientSecret) {
          return redirect(adminReturnUrl({ error: 'Missing Mastodon instance/credentials', type: 'mastodon' }));
        }
        const tokenRes = await fetch(`${instanceUrl}/oauth/token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            grant_type: 'authorization_code',
            code,
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: callback,
            scope: 'write:statuses read:accounts',
          }),
        });
        if (!tokenRes.ok) {
          const body = await tokenRes.text().catch(() => '');
          return redirect(
            adminReturnUrl({
              error: `Mastodon token exchange failed (${tokenRes.status}): ${body.slice(0, 120)}`,
              type: 'mastodon',
            }),
          );
        }
        const json = (await tokenRes.json()) as { access_token?: string };
        if (!json.access_token) {
          return redirect(adminReturnUrl({ error: 'Mastodon token response missing access_token', type: 'mastodon' }));
        }
        await saveDestinationPatch(req, pending.destinationId, {
          accessToken: json.access_token,
          instanceUrl,
          clientId,
          clientSecret,
        });
        return redirect(adminReturnUrl({ ok: true, type: 'mastodon' }));
      }
      case 'linkedin': {
        if (!clientId || !clientSecret) {
          return redirect(adminReturnUrl({ error: 'Missing LinkedIn client credentials', type: 'linkedin' }));
        }
        const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: callback,
          }),
        });
        if (!tokenRes.ok) {
          const body = await tokenRes.text().catch(() => '');
          return redirect(
            adminReturnUrl({
              error: `LinkedIn token exchange failed (${tokenRes.status}): ${body.slice(0, 120)}`,
              type: 'linkedin',
            }),
          );
        }
        const json = (await tokenRes.json()) as {
          access_token?: string;
          refresh_token?: string;
        };
        if (!json.access_token) {
          return redirect(adminReturnUrl({ error: 'LinkedIn token response missing access_token', type: 'linkedin' }));
        }
        let pageId = loaded.row.pageId || '';
        try {
          const meRes = await fetch('https://api.linkedin.com/v2/userinfo', {
            headers: { Authorization: `Bearer ${json.access_token}` },
          });
          if (meRes.ok) {
            const me = (await meRes.json()) as { sub?: string };
            if (me.sub && !pageId) pageId = `urn:li:person:${me.sub}`;
          }
        } catch {
          // optional
        }
        await saveDestinationPatch(req, pending.destinationId, {
          accessToken: json.access_token,
          ...(json.refresh_token ? { refreshToken: json.refresh_token } : {}),
          ...(pageId ? { pageId } : {}),
        });
        return redirect(adminReturnUrl({ ok: true, type: 'linkedin' }));
      }
      case 'pinterest': {
        if (!clientId || !clientSecret || !pending.codeVerifier) {
          return redirect(adminReturnUrl({ error: 'Missing Pinterest PKCE/credentials', type: 'pinterest' }));
        }
        const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
        const tokenRes = await fetch('https://api.pinterest.com/v5/oauth/token', {
          method: 'POST',
          headers: {
            Authorization: `Basic ${basic}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            redirect_uri: callback,
            code_verifier: pending.codeVerifier,
          }),
        });
        if (!tokenRes.ok) {
          const body = await tokenRes.text().catch(() => '');
          return redirect(
            adminReturnUrl({
              error: `Pinterest token exchange failed (${tokenRes.status}): ${body.slice(0, 120)}`,
              type: 'pinterest',
            }),
          );
        }
        const json = (await tokenRes.json()) as {
          access_token?: string;
          refresh_token?: string;
        };
        if (!json.access_token) {
          return redirect(adminReturnUrl({ error: 'Pinterest token response missing access_token', type: 'pinterest' }));
        }
        await saveDestinationPatch(req, pending.destinationId, {
          accessToken: json.access_token,
          ...(json.refresh_token ? { refreshToken: json.refresh_token } : {}),
        });
        return redirect(adminReturnUrl({ ok: true, type: 'pinterest' }));
      }
      case 'x': {
        if (!clientId || !clientSecret || !pending.codeVerifier) {
          return redirect(adminReturnUrl({ error: 'Missing X PKCE/credentials', type: 'x' }));
        }
        const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
        const tokenRes = await fetch('https://api.twitter.com/2/oauth2/token', {
          method: 'POST',
          headers: {
            Authorization: `Basic ${basic}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            redirect_uri: callback,
            code_verifier: pending.codeVerifier,
          }),
        });
        if (!tokenRes.ok) {
          const body = await tokenRes.text().catch(() => '');
          return redirect(
            adminReturnUrl({
              error: `X token exchange failed (${tokenRes.status}): ${body.slice(0, 120)}`,
              type: 'x',
            }),
          );
        }
        const json = (await tokenRes.json()) as {
          access_token?: string;
          refresh_token?: string;
        };
        if (!json.access_token) {
          return redirect(adminReturnUrl({ error: 'X token response missing access_token', type: 'x' }));
        }
        await saveDestinationPatch(req, pending.destinationId, {
          accessToken: json.access_token,
          ...(json.refresh_token ? { refreshToken: json.refresh_token } : {}),
        });
        return redirect(adminReturnUrl({ ok: true, type: 'x' }));
      }
      default:
        return redirect(adminReturnUrl({ error: `Unhandled OAuth type ${pending.type}` }));
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'OAuth callback failed';
    return redirect(adminReturnUrl({ error: message, type: pending.type }));
  }
}
