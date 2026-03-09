import { allowAll } from '@/access/methods/allowAll';
import { allowedRoles } from '@/access/methods/allowedRoles';
import { RBAC } from '@/access/RBAC';
import { Groups } from '@/collections/shared/groups';
import { slugField } from '@/fields/slug';
import { CollectionConfig } from 'payload';

export const GalleryTags: CollectionConfig<'gallery-tags'> = {
  slug: 'gallery-tags',
  access: {
    read: RBAC(allowAll(), [], 'gallery-tags', 'read'),
    create: RBAC(allowedRoles(['admin']), [], 'gallery-tags', 'create'),
    update: RBAC(allowedRoles(['admin']), [], 'gallery-tags', 'update'),
    delete: RBAC(allowedRoles(['admin']), [], 'gallery-tags', 'delete'),
    readVersions: RBAC(allowedRoles(['admin']), [], 'gallery-tags', 'readVersions'),
    unlock: RBAC(allowedRoles(['admin']), [], 'gallery-tags', 'unlock'),
    admin: RBAC(allowedRoles(['admin']), [], 'gallery-tags', 'admin'),
  },
  labels: {
    singular: 'Tag',
    plural: 'Tags',
  },
  admin: {
    useAsTitle: 'title',
    group: Groups.galleries,
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
