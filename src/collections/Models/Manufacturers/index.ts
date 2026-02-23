import { RBAC } from '@/access';
import { Groups } from '@/collections/groups';
import { slugField } from '@/fields/slug';
import { CollectionConfig } from 'payload';

export const Manufacturers: CollectionConfig<'manufacturers'> = {
  slug: 'manufacturers',
  access: {
    read: RBAC().allowAll().result(),
    create: RBAC().allowedRoles(['admin']).result(),
    update: RBAC().allowedRoles(['admin']).result(),
    delete: RBAC().allowedRoles(['admin']).result(),
    readVersions: RBAC().allowedRoles(['admin']).result(),
    unlock: RBAC().allowedRoles(['admin']).result(),
    admin: RBAC().allowedRoles(['admin']).result(),
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
