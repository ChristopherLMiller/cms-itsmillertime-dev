import { RBAC } from '@/access/new';
import { Groups } from '@/collections/groups';
import { GlobalConfig } from 'payload';

export const SiteMeta: GlobalConfig = {
  slug: 'site-meta',
  admin: {
    group: Groups.global,
  },
  access: {
    read: RBAC().allowAll().result(),
    update: RBAC().allowedRoles(['admin']).result(),
    readVersions: RBAC().allowedRoles(['admin']).result(),
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
