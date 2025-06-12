import { RBAC } from '@/access/RBAC';
import { Groups } from '@/collections/groups';
import { slugField } from '@/fields/slug';
import { CollectionConfig } from 'payload';

export const Scales: CollectionConfig<'scales'> = {
  slug: 'scales',
  access: RBAC('scales'),
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
