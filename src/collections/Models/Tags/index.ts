import { RBAC } from '@/access/RBAC';
import { slugField } from '@/fields/slug';
import { CollectionConfig } from 'payload';

export const ModelsTags: CollectionConfig<'models-tags'> = {
  slug: 'models-tags',
  access: RBAC('models-tags'),
  admin: {
    useAsTitle: 'title',
    group: 'Models',
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
