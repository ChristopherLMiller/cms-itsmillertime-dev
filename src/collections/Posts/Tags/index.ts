import { RBAC } from '@/access/RBAC';
import { allowAll } from '@/access/methods/allowAll';
import { allowedRoles } from '@/access/methods/allowedRoles';
import { Groups } from '@/collections/shared/groups';
import { slugField } from '@/fields/slug';
import { CollectionConfig } from 'payload';

export const PostsTags: CollectionConfig<'posts-tags'> = {
  slug: 'posts-tags',
  access: {
    read: RBAC(allowAll(), [], 'posts-tags', 'read'),
    create: RBAC(allowedRoles(['admin']), [], 'posts-tags', 'create'),
    update: RBAC(allowedRoles(['admin']), [], 'posts-tags', 'update'),
    delete: RBAC(allowedRoles(['admin']), [], 'posts-tags', 'delete'),
    readVersions: RBAC(allowedRoles(['admin']), [], 'posts-tags', 'readVersions'),
    unlock: RBAC(allowedRoles(['admin']), [], 'posts-tags', 'unlock'),
    admin: RBAC(allowedRoles(['admin']), [], 'posts-tags', 'admin'),
  },
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
