import { RBAC } from '@/access/RBAC';
import { slugField } from '@/fields/slug';
import { CollectionConfig } from 'payload';

export const GalleryCategories: CollectionConfig<'gallery-categories'> = {
  slug: 'gallery-categories',
  access: RBAC('gallery-categories'),
  admin: {
    useAsTitle: 'title',
    group: 'Gallery',
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
