import { RBAC } from '@/access/RBAC';
import { slugField } from '@/fields/slug';
import { CollectionConfig } from 'payload';

export const Manufacturers: CollectionConfig<'manufacturers'> = {
  slug: 'manufacturers',
  access: RBAC('manufacturers'),
  admin: {
    useAsTitle: 'title',
    group: 'Models',
    description: 'Model kit manufacturers',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    ...slugField(),
  ],
};
