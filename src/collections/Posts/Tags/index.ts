import { RBAC } from '@/access/RBAC';
import { Groups } from '@/collections/groups';
import { slugField } from '@/fields/slug';
import { CollectionConfig } from 'payload';

export const PostsTags: CollectionConfig<'posts-tags'> = {
  slug: 'posts-tags',
  access: RBAC('posts-tags'),
  labels: {
    plural: 'Tags',
    singular: 'Tag',
  },
  admin: {
    useAsTitle: 'title',
    group: Groups.blog,
    description: 'Blog tags.  Used for more focused classification of blog posts.',
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
