import { RBAC } from '@/access/RBAC';
import { link } from '@/fields/link';
import { slugField } from '@/fields/slug';
import { CollectionConfig } from 'payload';

export const NavItems: CollectionConfig<'nav-items'> = {
  slug: 'nav-items',
  access: RBAC('nav-items'),
  admin: {
    defaultColumns: ['label', 'icon', 'order'],
    useAsTitle: 'label',
  },
  fields: [
    {
      name: 'label',
      type: 'text',
      required: true,
    },
    link({ appearances: false, disableLabel: true }),
    {
      name: 'order',
      label: 'Display Order',
      type: 'number',
      min: 0,
      defaultValue: 1,
      max: 100,
      required: true,
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'icon',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'childrenNodes',
      type: 'relationship',
      relationTo: 'nav-items',
      hasMany: true,
      admin: {
        position: 'sidebar',
      },
    },
    ...slugField('label'),
  ],
};
