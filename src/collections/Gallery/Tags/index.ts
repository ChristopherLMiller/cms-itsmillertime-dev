import { RBAC } from '@/access';
import { Groups } from '@/collections/shared/groups';
import { slugField } from '@/fields/slug';
import { CollectionConfig } from 'payload';

export const GalleryTags: CollectionConfig<'gallery-tags'> = {
  slug: 'gallery-tags',
  access: {
    read: RBAC().allowAll().result(),
    create: RBAC().allowedRoles(['admin']).result(),
    update: RBAC().allowedRoles(['admin']).result(),
    delete: RBAC().allowedRoles(['admin']).result(),
    readVersions: RBAC().allowedRoles(['admin']).result(),
    unlock: RBAC().allowedRoles(['admin']).result(),
    admin: RBAC().allowedRoles(['admin']).result(),
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
