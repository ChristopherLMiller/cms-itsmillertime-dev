import type { Field } from 'payload';
import { SOCIAL_PLATFORM_TYPES } from '@/utilities/socialPlatforms';

function whenType(...types: string[]) {
  return (_: unknown, siblingData: { type?: string } | undefined) =>
    Boolean(siblingData?.type && types.includes(siblingData.type));
}

/** Shared announce tracking group — set-once after send or skip. */
export const announceFields: Field = {
  name: 'announce',
  type: 'group',
  label: 'Publish announce',
  admin: {
    position: 'sidebar',
    description:
      'Tracks whether this document was announced to social destinations. Use the Announce button to post.',
  },
  fields: [
    {
      name: 'notifiedAt',
      type: 'date',
      admin: {
        readOnly: true,
        date: { pickerAppearance: 'dayAndTime' },
        description: 'Set automatically after a successful announce.',
      },
    },
    {
      name: 'skippedAt',
      type: 'date',
      admin: {
        readOnly: true,
        date: { pickerAppearance: 'dayAndTime' },
        description: 'Set when announce was skipped so it will not prompt again.',
      },
    },
  ],
};

/** Destination credential fields for the social-destinations Global. */
export const socialDestinationFields: Field[] = [
  {
    name: 'label',
    type: 'text',
    required: true,
    admin: {
      description: 'Shown in the announce dialog, e.g. “Discord – #blog”.',
    },
  },
  {
    name: 'type',
    type: 'select',
    required: true,
    options: [...SOCIAL_PLATFORM_TYPES],
    admin: {
      description:
        'Discord/Slack: webhook URL. Reddit: subreddit + OAuth app. X: bearer or OAuth1. Bluesky: handle + app password. Mastodon: instance + token. Facebook/Instagram/Threads: page/user id + token. LinkedIn: author URN + token. Telegram: bot + chat. Tumblr: blog + OAuth1. Pinterest: board + token (+ og:image).',
    },
  },
  {
    name: 'enabled',
    type: 'checkbox',
    defaultValue: true,
  },
  {
    name: 'defaultSelected',
    type: 'checkbox',
    defaultValue: false,
    admin: {
      description: 'Pre-check this destination in the announce dialog.',
    },
  },
  {
    name: 'webhookUrl',
    type: 'text',
    admin: {
      description: 'Encrypted at rest. Incoming webhook URL (Discord, Slack, or custom).',
      condition: whenType('discord', 'slack', 'custom_webhook'),
    },
  },
  {
    name: 'subreddit',
    type: 'text',
    admin: {
      description: 'Subreddit name without r/',
      condition: whenType('reddit'),
    },
  },
  {
    name: 'instanceUrl',
    type: 'text',
    admin: {
      description: 'e.g. https://mastodon.social',
      condition: whenType('mastodon'),
    },
  },
  {
    name: 'handle',
    type: 'text',
    admin: {
      description: 'Bluesky handle (user.bsky.social). Optional for Threads if pageId is set.',
      condition: whenType('bluesky', 'mastodon', 'x', 'threads'),
    },
  },
  {
    name: 'pageId',
    type: 'text',
    admin: {
      description:
        'Facebook Page ID, Instagram business account ID, Threads user ID, or LinkedIn author URN / org id.',
      condition: whenType('facebook', 'linkedin', 'instagram', 'threads'),
    },
  },
  {
    name: 'boardId',
    type: 'text',
    admin: {
      description: 'Pinterest board id',
      condition: whenType('pinterest'),
    },
  },
  {
    name: 'chatId',
    type: 'text',
    admin: {
      description: 'Telegram chat / channel id (e.g. @channel or -100…)',
      condition: whenType('telegram'),
    },
  },
  {
    name: 'blogName',
    type: 'text',
    admin: {
      description: 'Tumblr blog name (without .tumblr.com)',
      condition: whenType('tumblr'),
    },
  },
  {
    name: 'clientId',
    type: 'text',
    admin: {
      description: 'OAuth client / app id (Reddit, etc.)',
      condition: whenType('reddit', 'x', 'linkedin', 'tumblr', 'pinterest'),
    },
  },
  {
    name: 'clientSecret',
    type: 'text',
    admin: {
      description: 'Encrypted at rest. OAuth client secret.',
      condition: whenType('reddit', 'x', 'linkedin', 'tumblr', 'pinterest'),
    },
  },
  {
    name: 'accessToken',
    type: 'text',
    admin: {
      description:
        'Encrypted at rest. API access token / OAuth 2 bearer (or OAuth 1 access token for X/Tumblr).',
      condition: whenType(
        'reddit',
        'x',
        'bluesky',
        'mastodon',
        'facebook',
        'instagram',
        'linkedin',
        'threads',
        'tumblr',
        'pinterest',
      ),
    },
  },
  {
    name: 'refreshToken',
    type: 'text',
    admin: {
      description:
        'Encrypted at rest. OAuth refresh token (Reddit) or OAuth 1.0a token secret (X / Tumblr).',
      condition: whenType('reddit', 'x', 'linkedin', 'tumblr', 'pinterest'),
    },
  },
  {
    name: 'apiKey',
    type: 'text',
    admin: {
      description: 'Encrypted at rest. Consumer / API key (X, Tumblr).',
      condition: whenType('x', 'tumblr', 'custom_webhook'),
    },
  },
  {
    name: 'apiSecret',
    type: 'text',
    admin: {
      description: 'Encrypted at rest. Consumer / API secret (X, Tumblr).',
      condition: whenType('x', 'tumblr'),
    },
  },
  {
    name: 'appPassword',
    type: 'text',
    admin: {
      description: 'Encrypted at rest. Bluesky app password.',
      condition: whenType('bluesky'),
    },
  },
  {
    name: 'botToken',
    type: 'text',
    admin: {
      description: 'Encrypted at rest. Telegram bot token from BotFather.',
      condition: whenType('telegram'),
    },
  },
  {
    name: 'bearerToken',
    type: 'text',
    admin: {
      description: 'Encrypted at rest. Optional auth for custom webhooks / Mastodon alternate.',
      condition: whenType('custom_webhook', 'mastodon', 'x'),
    },
  },
  {
    name: 'notes',
    type: 'textarea',
    admin: {
      description: 'Private notes about this destination (not posted).',
    },
  },
];
