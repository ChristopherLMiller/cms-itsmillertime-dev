import type { Field, TextField } from 'payload';
import { SOCIAL_PLATFORM_TYPES } from '@/utilities/socialPlatforms';

function whenType(...types: string[]) {
  return (_: unknown, siblingData: { type?: string } | undefined) =>
    Boolean(siblingData?.type && types.includes(siblingData.type));
}

/** Text field that masks encrypted secrets and decrypts on eye-toggle reveal. */
function secretField(field: {
  name: string;
  admin?: TextField['admin'];
}): TextField {
  return {
    name: field.name,
    type: 'text',
    admin: {
      ...field.admin,
      components: {
        ...field.admin?.components,
        Field: '@/components/EncryptedSecretField#EncryptedSecretField',
      },
    },
  };
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
        'Pick a platform to see setup steps below. Discord/Slack use webhooks; others use tokens or OAuth Authorize where available.',
    },
  },
  {
    name: 'setupGuide',
    type: 'ui',
    admin: {
      components: {
        Field: '@/components/DestinationSetupGuide#DestinationSetupGuide',
      },
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
  secretField({
    name: 'webhookUrl',
    admin: {
      description: 'Encrypted at rest. Incoming webhook URL (Discord, Slack, or custom).',
      condition: whenType('discord', 'slack', 'custom_webhook'),
    },
  }),
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
  secretField({
    name: 'clientSecret',
    admin: {
      description: 'Encrypted at rest. OAuth client secret.',
      condition: whenType('reddit', 'x', 'linkedin', 'tumblr', 'pinterest'),
    },
  }),
  secretField({
    name: 'accessToken',
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
  }),
  secretField({
    name: 'refreshToken',
    admin: {
      description:
        'Encrypted at rest. OAuth refresh token (Reddit) or OAuth 1.0a token secret (X / Tumblr).',
      condition: whenType('reddit', 'x', 'linkedin', 'tumblr', 'pinterest'),
    },
  }),
  secretField({
    name: 'apiKey',
    admin: {
      description: 'Encrypted at rest. Consumer / API key (X, Tumblr).',
      condition: whenType('x', 'tumblr', 'custom_webhook'),
    },
  }),
  secretField({
    name: 'apiSecret',
    admin: {
      description: 'Encrypted at rest. Consumer / API secret (X, Tumblr).',
      condition: whenType('x', 'tumblr'),
    },
  }),
  secretField({
    name: 'appPassword',
    admin: {
      description: 'Encrypted at rest. Bluesky app password.',
      condition: whenType('bluesky'),
    },
  }),
  secretField({
    name: 'botToken',
    admin: {
      description: 'Encrypted at rest. Telegram bot token from BotFather.',
      condition: whenType('telegram'),
    },
  }),
  secretField({
    name: 'bearerToken',
    admin: {
      description: 'Encrypted at rest. Optional auth for custom webhooks / Mastodon alternate.',
      condition: whenType('custom_webhook', 'mastodon', 'x'),
    },
  }),
  {
    name: 'notes',
    type: 'textarea',
    admin: {
      description: 'Private notes about this destination (not posted).',
    },
  },
  {
    name: 'testConnection',
    type: 'ui',
    admin: {
      components: {
        Field: '@/components/DestinationTestButton#DestinationTestButton',
      },
    },
  },
];
