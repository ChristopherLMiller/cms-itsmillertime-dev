import { RBAC } from '@/access/RBAC';
import { allowAll } from '@/access/methods/allowAll';
import { allowedRoles } from '@/access/methods/allowedRoles';
import { Groups } from '@/collections/shared/groups';
import { slugField } from '@/fields/slug';
import { CollectionConfig } from 'payload';

export const Manufacturers: CollectionConfig<'manufacturers'> = {
  slug: 'manufacturers',
  access: {
    read: RBAC(allowAll(), [], 'manufacturers', 'read'),
    create: RBAC(allowedRoles(['admin']), [], 'manufacturers', 'create'),
    update: RBAC(allowedRoles(['admin']), [], 'manufacturers', 'update'),
    delete: RBAC(allowedRoles(['admin']), [], 'manufacturers', 'delete'),
    readVersions: RBAC(allowedRoles(['admin']), [], 'manufacturers', 'readVersions'),
    unlock: RBAC(allowedRoles(['admin']), [], 'manufacturers', 'unlock'),
    admin: RBAC(allowedRoles(['admin']), [], 'manufacturers', 'admin'),
  },
  admin: {
    useAsTitle: 'title',
    group: Groups.models,
    description: 'Model kit manufacturers',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      label: 'Brand Name',
    },
    ...slugField(),
  ],
};
