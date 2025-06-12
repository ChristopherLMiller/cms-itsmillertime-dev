import { RBAC } from '@/access/RBAC';
import { Groups } from '@/collections/groups';
import { slugField } from '@/fields/slug';
import { CollectionConfig } from 'payload';

export const Manufacturers: CollectionConfig<'manufacturers'> = {
  slug: 'manufacturers',
  access: RBAC('manufacturers'),
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
