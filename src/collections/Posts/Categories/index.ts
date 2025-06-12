import { RBAC } from '@/access/RBAC';
import { Groups } from '@/collections/groups';
import { slugField } from '@/fields/slug';
import { CollectionConfig } from 'payload';

export const PostsCategories: CollectionConfig<'posts-categories'> = {
  slug: 'posts-categories',
  access: RBAC('posts-categories'),
  admin: {
    useAsTitle: 'title',
    group: Groups.blog,
    description: 'Blog categories.  Used for general classification of blog posts.',
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
