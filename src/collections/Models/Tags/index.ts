import { RBAC } from '@/access/RBAC';
import { Groups } from '@/collections/groups';
import { slugField } from '@/fields/slug';
import { CollectionConfig } from 'payload';

export const ModelsTags: CollectionConfig<'models-tags'> = {
  slug: 'models-tags',
  access: RBAC('models-tags'),
  admin: {
    useAsTitle: 'title',
    group: Groups.models,
    description: 'Models tags.  Used for more focused classification of models.',
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
