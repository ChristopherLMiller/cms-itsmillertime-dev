import { RBAC } from '@/access/RBAC';
import { allowedRoles } from '@/access/methods/allowedRoles';
import { Groups } from '@/collections/shared/groups';
import { encryptGroupField } from '@/lib/settings-encryption';
import {
  DEFAULT_IMAGE_ALT_PROMPT,
  IMAGE_ALT_PROMPT_SLUG,
} from '@/globals/default-prompts';
import { DEFAULT_FROM_ADDRESS, DEFAULT_FROM_NAME } from '@/utilities/emailFrom';
import type { GlobalBeforeChangeHook, GlobalConfig } from 'payload';

const encryptSecrets: GlobalBeforeChangeHook = ({ data }) => {
  if (!data || typeof data !== 'object') return data;
  const next = data as Record<string, unknown>;
  encryptGroupField(asGroup(next.ai), 'apiKey');
  encryptGroupField(asGroup(next.lastfm), 'apiKey');
  encryptGroupField(asGroup(next.email), 'resendApiKey');
  return next;
};

function asGroup(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  return value as Record<string, unknown>;
}

export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  label: 'Site Settings',
  admin: {
    group: Groups.global,
    description:
      'Integration keys and prompts. API keys are encrypted at rest. Prefer the www /admin editors to view plaintext keys.',
  },
  access: {
    read: RBAC(allowedRoles(['admin']), [], 'site-settings', 'read'),
    update: RBAC(allowedRoles(['admin']), [], 'site-settings', 'update'),
    readVersions: RBAC(allowedRoles(['admin']), [], 'site-settings', 'readVersions'),
  },
  hooks: {
    beforeChange: [encryptSecrets],
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          name: 'ai',
          label: 'AI',
          fields: [
            {
              name: 'provider',
              type: 'select',
              defaultValue: 'anthropic',
              options: [
                { label: 'Anthropic (Claude)', value: 'anthropic' },
                { label: 'OpenAI', value: 'openai' },
              ],
            },
            {
              name: 'model',
              type: 'text',
              defaultValue: 'claude-sonnet-5',
              admin: {
                description:
                  'Provider model id. Leave blank to use the frontend default for that provider.',
              },
            },
            {
              name: 'apiKey',
              type: 'text',
              admin: {
                description:
                  'Encrypted at rest. After save this field shows ciphertext here. Use www /admin to view the plaintext key.',
              },
            },
            {
              name: 'prompts',
              type: 'array',
              labels: { singular: 'Prompt', plural: 'Prompts' },
              admin: {
                description:
                  'Looked up by slug (e.g. image-alt). Add rows for new AI tasks without a schema change.',
                initCollapsed: true,
                components: {
                  RowLabel: {
                    path: '@/components/RowLabel#RowLabel',
                  },
                },
              },
              defaultValue: [
                {
                  slug: IMAGE_ALT_PROMPT_SLUG,
                  label: 'Photo alt text',
                  body: DEFAULT_IMAGE_ALT_PROMPT,
                },
              ],
              fields: [
                {
                  name: 'slug',
                  type: 'text',
                  required: true,
                  admin: {
                    description: 'Stable id used in code, e.g. image-alt',
                  },
                },
                {
                  name: 'label',
                  type: 'text',
                  required: true,
                },
                {
                  name: 'body',
                  type: 'textarea',
                  required: true,
                },
              ],
              validate: (value: unknown) => {
                if (!Array.isArray(value)) return true;
                const slugs = value
                  .map((row) =>
                    row && typeof row === 'object' && 'slug' in row
                      ? String((row as { slug?: unknown }).slug ?? '')
                          .trim()
                          .toLowerCase()
                      : '',
                  )
                  .filter(Boolean);
                const unique = new Set(slugs);
                if (unique.size !== slugs.length) {
                  return 'Prompt slugs must be unique';
                }
                return true;
              },
            },
          ],
        },
        {
          name: 'lastfm',
          label: 'Last.fm',
          fields: [
            {
              name: 'username',
              type: 'text',
            },
            {
              name: 'apiKey',
              type: 'text',
              admin: {
                description: 'Encrypted at rest. Env LASTFM_API_KEY is used until this is set.',
              },
            },
          ],
        },
        {
          name: 'email',
          label: 'Email',
          fields: [
            {
              name: 'resendApiKey',
              type: 'text',
              admin: {
                description: 'Encrypted at rest. Env RESEND_API_KEY is used until this is set.',
              },
            },
            {
              name: 'fromAddress',
              type: 'email',
              defaultValue: DEFAULT_FROM_ADDRESS,
            },
            {
              name: 'fromName',
              type: 'text',
              defaultValue: DEFAULT_FROM_NAME,
            },
          ],
        },
      ],
    },
  ],
};
