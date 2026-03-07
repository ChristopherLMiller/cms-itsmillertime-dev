import { allowAll } from '@/access/methods/allowAll';
import { allowedRoles } from '@/access/methods/allowedRoles';
import { RBAC } from '@/access/RBAC';
import { Groups } from '@/collections/shared/groups';
import { slugField } from '@/fields/slug';
import { CollectionConfig } from 'payload';

export const GalleryCategories: CollectionConfig<'gallery-categories'> = {
  slug: 'gallery-categories',
  access: {
    read: RBAC(allowAll(), [], 'gallery-categories', 'read'),
    create: RBAC(allowedRoles(['admin']), [], 'gallery-categories', 'create'),
    update: RBAC(allowedRoles(['admin']), [], 'gallery-categories', 'update'),
    delete: RBAC(allowedRoles(['admin']), [], 'gallery-categories', 'delete'),
    readVersions: RBAC(allowedRoles(['admin']), [], 'gallery-categories', 'readVersions'),
    unlock: RBAC(allowedRoles(['admin']), [], 'gallery-categories', 'unlock'),
    admin: RBAC(allowedRoles(['admin']), [], 'gallery-categories', 'admin'),
  },
  labels: {
    singular: 'Category',
    plural: 'Categories',
  },
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
