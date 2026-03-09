import { RBAC } from '@/access/RBAC';
import { allowAll } from '@/access/methods/allowAll';
import { allowedRoles } from '@/access/methods/allowedRoles';
import { Groups } from '@/collections/shared/groups';
import { slugField } from '@/fields/slug';
import { CollectionConfig } from 'payload';

export const PostsCategories: CollectionConfig<'posts-categories'> = {
  slug: 'posts-categories',
  access: {
    read: RBAC(allowAll(), [], 'posts-categories', 'read'),
    create: RBAC(allowedRoles(['admin']), [], 'posts-categories', 'create'),
    update: RBAC(allowedRoles(['admin']), [], 'posts-categories', 'update'),
    delete: RBAC(allowedRoles(['admin']), [], 'posts-categories', 'delete'),
    readVersions: RBAC(allowedRoles(['admin']), [], 'posts-categories', 'readVersions'),
    unlock: RBAC(allowedRoles(['admin']), [], 'posts-categories', 'unlock'),
    admin: RBAC(allowedRoles(['admin']), [], 'posts-categories', 'admin'),
  },
  labels: {
    plural: 'Categories',
    singular: 'Category',
  },
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
