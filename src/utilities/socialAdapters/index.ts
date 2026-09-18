import type { SocialPlatformType } from '@/utilities/socialPlatforms';
import { postBluesky } from './bluesky';
import { postFacebook } from './facebook';
import { postInstagram } from './instagram';
import { postLinkedIn } from './linkedin';
import { postMastodon } from './mastodon';
import { postPinterest } from './pinterest';
import { postReddit } from './reddit';
import { postTelegram } from './telegram';
import { postThreads } from './threads';
import { postTumblr } from './tumblr';
import {
  type AnnounceAdapterResult,
  type AnnouncePayload,
  type SocialDestinationRow,
} from './types';
import { postCustomWebhook, postDiscord, postSlack } from './webhooks';
import { postX } from './x';

export type { AnnounceAdapterResult, AnnouncePayload, SocialDestinationRow };

type AdapterFn = (args: AnnouncePayload) => Promise<AnnounceAdapterResult>;

const ADAPTERS: Record<SocialPlatformType, AdapterFn> = {
  discord: postDiscord,
  slack: postSlack,
  reddit: postReddit,
  x: postX,
  bluesky: postBluesky,
  mastodon: postMastodon,
  facebook: postFacebook,
  instagram: postInstagram,
  linkedin: postLinkedIn,
  threads: postThreads,
  telegram: postTelegram,
  tumblr: postTumblr,
  pinterest: postPinterest,
  custom_webhook: postCustomWebhook,
};

export const IMPLEMENTED_PLATFORM_TYPES = Object.keys(ADAPTERS) as SocialPlatformType[];

export function isImplementedPlatform(type: string | null | undefined): boolean {
  return Boolean(type && type in ADAPTERS);
}

export async function sendToDestination(args: AnnouncePayload): Promise<AnnounceAdapterResult> {
  const type = (args.destination.type || '') as SocialPlatformType;
  const adapter = ADAPTERS[type];
  if (!adapter) {
    return {
      ok: false,
      error: `Unknown destination type “${type || '(empty)'}”`,
    };
  }
  try {
    return await adapter(args);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `${type} adapter threw: ${message}` };
  }
}
