import { RBAC } from '@/access/RBAC';
import { allowAll } from '@/access/methods/allowAll';
import { allowedRoles } from '@/access/methods/allowedRoles';
import { Groups } from '@/collections/shared/groups';
import { slugField } from '@/fields/slug';
import { CollectionConfig } from 'payload';

export const ModelsTags: CollectionConfig<'models-tags'> = {
  slug: 'models-tags',
  access: {
    read: RBAC(allowAll(), [], 'models-tags', 'read'),
    create: RBAC(allowedRoles(['admin']), [], 'models-tags', 'create'),
    update: RBAC(allowedRoles(['admin']), [], 'models-tags', 'update'),
    delete: RBAC(allowedRoles(['admin']), [], 'models-tags', 'delete'),
    readVersions: RBAC(allowedRoles(['admin']), [], 'models-tags', 'readVersions'),
    unlock: RBAC(allowedRoles(['admin']), [], 'models-tags', 'unlock'),
    admin: RBAC(allowedRoles(['admin']), [], 'models-tags', 'admin'),
  },
  admin: {
    useAsTitle: 'title',
    group: Groups.models,
    description: 'Models tags.  Used for more focused classification of models.',
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
