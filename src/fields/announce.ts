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
      description: 'Encrypted at rest. Incoming webhook URL.',
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
      condition: whenType('bluesky', 'mastodon', 'x', 'threads'),
    },
  },
  {
    name: 'pageId',
    type: 'text',
    admin: {
      condition: whenType('facebook', 'linkedin', 'instagram'),
    },
  },
  {
    name: 'boardId',
    type: 'text',
    admin: {
      condition: whenType('pinterest'),
    },
  },
  {
    name: 'chatId',
    type: 'text',
    admin: {
      condition: whenType('telegram'),
    },
  },
  {
    name: 'blogName',
    type: 'text',
    admin: {
      condition: whenType('tumblr'),
    },
  },
  {
    name: 'clientId',
    type: 'text',
    admin: {
      condition: whenType('reddit', 'x', 'linkedin', 'tumblr', 'pinterest'),
    },
  },
  {
    name: 'clientSecret',
    type: 'text',
    admin: {
      description: 'Encrypted at rest.',
      condition: whenType('reddit', 'x', 'linkedin', 'tumblr', 'pinterest'),
    },
  },
  {
    name: 'accessToken',
    type: 'text',
    admin: {
      description: 'Encrypted at rest.',
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
      description: 'Encrypted at rest.',
      condition: whenType('reddit', 'x', 'linkedin', 'tumblr', 'pinterest'),
    },
  },
  {
    name: 'apiKey',
    type: 'text',
    admin: {
      description: 'Encrypted at rest.',
      condition: whenType('x', 'custom_webhook'),
    },
  },
  {
    name: 'apiSecret',
    type: 'text',
    admin: {
      description: 'Encrypted at rest.',
      condition: whenType('x'),
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
      description: 'Encrypted at rest.',
      condition: whenType('telegram'),
    },
  },
  {
    name: 'bearerToken',
    type: 'text',
    admin: {
      description: 'Encrypted at rest. Optional auth for custom webhooks.',
      condition: whenType('custom_webhook', 'mastodon'),
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
