import { RBAC } from '@/access/RBAC';
import { allowAll } from '@/access/methods/allowAll';
import { allowedRoles } from '@/access/methods/allowedRoles';
import { Groups } from '@/collections/shared/groups';
import { slugField } from '@/fields/slug';
import { CollectionConfig } from 'payload';

export const Scales: CollectionConfig<'scales'> = {
  slug: 'scales',
  access: {
    read: RBAC(allowAll(), [], 'scales', 'read'),
    create: RBAC(allowedRoles(['admin']), [], 'scales', 'create'),
    update: RBAC(allowedRoles(['admin']), [], 'scales', 'update'),
    delete: RBAC(allowedRoles(['admin']), [], 'scales', 'delete'),
    readVersions: RBAC(allowedRoles(['admin']), [], 'scales', 'readVersions'),
    unlock: RBAC(allowedRoles(['admin']), [], 'scales', 'unlock'),
    admin: RBAC(allowedRoles(['admin']), [], 'scales', 'admin'),
  },
  admin: {
    useAsTitle: 'title',
    group: Groups.models,
    description: 'Model kit scales',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      label: 'Scale',
    },
    ...slugField('title'),
  ],
};
