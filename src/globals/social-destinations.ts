import { RBAC } from '@/access/RBAC';
import { allowedRoles } from '@/access/methods/allowedRoles';
import { Groups } from '@/collections/shared/groups';
import { socialDestinationFields } from '@/fields/announce';
import { encryptSecret, isEncryptedSecret } from '@/lib/settings-encryption';
import type { GlobalBeforeChangeHook, GlobalConfig } from 'payload';

const SECRET_FIELDS = [
  'webhookUrl',
  'clientSecret',
  'accessToken',
  'refreshToken',
  'apiKey',
  'apiSecret',
  'appPassword',
  'botToken',
  'bearerToken',
] as const;

function encryptDestinationSecrets(row: Record<string, unknown>): void {
  for (const field of SECRET_FIELDS) {
    const raw = row[field];
    if (typeof raw !== 'string') continue;
    const trimmed = raw.trim();
    if (!trimmed) {
      row[field] = '';
      continue;
    }
    if (isEncryptedSecret(trimmed)) continue;
    try {
      row[field] = encryptSecret(trimmed);
    } catch (err) {
      console.error(`[social-destinations] failed to encrypt ${field}:`, err);
    }
  }
}

const encryptSecrets: GlobalBeforeChangeHook = ({ data }) => {
  if (!data || typeof data !== 'object') return data;
  const next = data as Record<string, unknown>;
  const destinations = next.destinations;
  if (!Array.isArray(destinations)) return next;
  for (const row of destinations) {
    if (row && typeof row === 'object' && !Array.isArray(row)) {
      encryptDestinationSecrets(row as Record<string, unknown>);
    }
  }
  return next;
};

export const SocialDestinations: GlobalConfig = {
  slug: 'social-destinations',
  label: 'Social Destinations',
  admin: {
    group: Groups.global,
    description:
      'Configure social platforms for first-publish announcements. Multiple rows of the same type are allowed (e.g. several Discords or Reddit subs). Secrets are encrypted at rest.',
  },
  access: {
    read: RBAC(allowedRoles(['admin']), [], 'social-destinations', 'read'),
    update: RBAC(allowedRoles(['admin']), [], 'social-destinations', 'update'),
    readVersions: RBAC(allowedRoles(['admin']), [], 'social-destinations', 'readVersions'),
  },
  hooks: {
    beforeChange: [encryptSecrets],
  },
  fields: [
    {
      name: 'destinations',
      type: 'array',
      labels: { singular: 'Destination', plural: 'Destinations' },
      admin: {
        initCollapsed: true,
        components: {
          RowLabel: {
            path: '@/components/RowLabel#RowLabel',
          },
        },
      },
      fields: socialDestinationFields,
    },
  ],
};
