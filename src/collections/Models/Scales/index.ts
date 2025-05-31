import { RBAC } from '@/access/RBAC';
import { slugField } from '@/fields/slug';
import { CollectionConfig } from 'payload';

export const Scales: CollectionConfig<'scales'> = {
  slug: 'scales',
  access: RBAC('scales'),
  admin: {
    useAsTitle: 'title',
    group: 'Models',
    description: 'Model kit scales',
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
