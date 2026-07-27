import { RBAC } from '@/access/RBAC';
import { allowAll } from '@/access/methods/allowAll';
import { allowedRoles } from '@/access/methods/allowedRoles';
import { Groups } from '@/collections/shared/groups';
import { GlobalConfig } from 'payload';

export const SiteMeta: GlobalConfig = {
  slug: 'site-meta',
  admin: {
    group: Groups.global,
  },
  access: {
    read: RBAC(allowAll(), [], 'site-meta', 'read'),
    update: RBAC(allowedRoles(['admin']), [], 'site-meta', 'update'),
    readVersions: RBAC(allowedRoles(['admin']), [], 'site-meta', 'readVersions'),
  },
  fields: [
    {
      name: 'siteMeta',
      type: 'array',
      admin: {
        components: {
          RowLabel: {
            path: '@/components/RowLabel#RowLabel',
          },
        },
      },
      fields: [
        {
          name: 'title',
          type: 'text',
          required: true,
        },
        {
          name: 'description',
          type: 'text',
          required: true,
        },
        { name: 'path', type: 'text', required: true },
      ],
    },
  ],
};
