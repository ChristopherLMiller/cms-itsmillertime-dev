import { RBAC } from '@/access';
import { Groups } from '@/collections/groups';
import { slugField } from '@/fields/slug';
import { CollectionConfig } from 'payload';

export const Scales: CollectionConfig<'scales'> = {
  slug: 'scales',
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
