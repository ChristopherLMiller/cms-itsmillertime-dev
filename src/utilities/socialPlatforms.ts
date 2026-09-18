/** Supported social destination types for publish announcements. */
export const SOCIAL_PLATFORM_TYPES = [
  { label: 'Discord', value: 'discord' },
  { label: 'Slack', value: 'slack' },
  { label: 'Reddit', value: 'reddit' },
  { label: 'X (Twitter)', value: 'x' },
  { label: 'Bluesky', value: 'bluesky' },
  { label: 'Mastodon', value: 'mastodon' },
  { label: 'Facebook Page', value: 'facebook' },
  { label: 'Instagram', value: 'instagram' },
  { label: 'LinkedIn', value: 'linkedin' },
  { label: 'Threads', value: 'threads' },
  { label: 'Telegram', value: 'telegram' },
  { label: 'Tumblr', value: 'tumblr' },
  { label: 'Pinterest', value: 'pinterest' },
  { label: 'Custom webhook', value: 'custom_webhook' },
] as const;

export type SocialPlatformType = (typeof SOCIAL_PLATFORM_TYPES)[number]['value'];

export const SOCIAL_PLATFORM_VALUES = SOCIAL_PLATFORM_TYPES.map((p) => p.value);

export const ANNOUNCE_COLLECTIONS = ['posts', 'models', 'gallery-albums'] as const;
export type AnnounceCollection = (typeof ANNOUNCE_COLLECTIONS)[number];

export function isAnnounceCollection(value: unknown): value is AnnounceCollection {
  return (
    typeof value === 'string' &&
    (ANNOUNCE_COLLECTIONS as readonly string[]).includes(value)
  );
}

export function platformLabel(type: string): string {
  return SOCIAL_PLATFORM_TYPES.find((p) => p.value === type)?.label ?? type;
}
