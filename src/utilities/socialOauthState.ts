import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { cmsBaseUrl } from '@/utilities/productRequestUrls';
import type { SocialPlatformType } from '@/utilities/socialPlatforms';

const STATE_TTL_MS = 15 * 60 * 1000;

export type OauthPendingState = {
  destinationId: string;
  type: SocialPlatformType;
  /** Mastodon instance origin when type=mastodon */
  instanceUrl?: string;
  /** PKCE verifier for X / Pinterest when used */
  codeVerifier?: string;
  /** Mastodon client id created during start */
  clientId?: string;
  clientSecret?: string;
  exp: number;
};

function signingKey(): Buffer {
  const raw = process.env.SETTINGS_ENCRYPTION_KEY?.trim() || process.env.PAYLOAD_SECRET?.trim();
  if (!raw) {
    throw new Error('SETTINGS_ENCRYPTION_KEY or PAYLOAD_SECRET is required for OAuth state');
  }
  return createHmac('sha256', 'social-dest-oauth').update(raw).digest();
}

export function socialOauthCallbackUrl(): string {
  return `${cmsBaseUrl()}/api/social-destinations/oauth/callback`;
}

export function encodeOauthState(payload: Omit<OauthPendingState, 'exp'>): string {
  const body: OauthPendingState = { ...payload, exp: Date.now() + STATE_TTL_MS };
  const json = Buffer.from(JSON.stringify(body), 'utf8').toString('base64url');
  const sig = createHmac('sha256', signingKey()).update(json).digest('base64url');
  return `${json}.${sig}`;
}

export function decodeOauthState(state: string): OauthPendingState | null {
  const [json, sig] = state.split('.');
  if (!json || !sig) return null;
  const expected = createHmac('sha256', signingKey()).update(json).digest('base64url');
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(json, 'base64url').toString('utf8')) as OauthPendingState;
    if (!parsed?.destinationId || !parsed?.type || !parsed?.exp) return null;
    if (Date.now() > parsed.exp) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function createPkcePair(): { verifier: string; challenge: string } {
  const verifier = randomBytes(32).toString('base64url');
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  return { verifier, challenge };
}
