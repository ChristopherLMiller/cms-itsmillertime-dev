import { RBAC } from '@/access/RBAC';
import { Groups } from '@/collections/groups';
import { slugField } from '@/fields/slug';
import { CollectionConfig } from 'payload';

export const GalleryCategories: CollectionConfig<'gallery-categories'> = {
  slug: 'gallery-categories',
  access: RBAC('gallery-categories'),
  admin: {
    useAsTitle: 'title',
    group: Groups.galleries,
    description: 'Gallery categories.  Primary method of filtering galleries.',
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
