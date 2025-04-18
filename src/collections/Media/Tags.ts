import { RBAC } from '@/access/RBAC';
import { slugField } from '@/fields/slug';
import { CollectionConfig } from 'payload';

export const MediaTags: CollectionConfig<'media-tags'> = {
  slug: 'media-tags',
  access: RBAC('media-tags'),
  admin: {
    useAsTitle: 'title',
    group: 'Media Library',
    description: 'Tagging of images for filtering',
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
