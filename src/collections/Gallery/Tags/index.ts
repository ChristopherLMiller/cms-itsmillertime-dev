import { RBAC } from '@/access/RBAC';
import { slugField } from '@/fields/slug';
import { CollectionConfig } from 'payload';

export const GalleryTags: CollectionConfig<'gallery-tags'> = {
  slug: 'gallery-tags',
  access: RBAC('gallery-tags'),
  admin: {
    useAsTitle: 'title',
    group: 'Gallery',
    description: 'Gallery tags.  Used for more focused classification of gallery images.',
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
