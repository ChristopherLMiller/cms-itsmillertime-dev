import type { CollectionConfig } from 'payload';

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
    group: 'Authentication & Authorization',
    description: 'User accounts',
    defaultColumns: ['displayName', 'email', 'roles', 'showNSFW'],
  },
  auth: true,
  fields: [
    {
      type: 'relationship',
      relationTo: 'roles',
      name: 'roles',
      required: true,
      hasMany: true,
    },
    {
      type: 'text',
      name: 'displayName',
      label: 'Display Name',
    },
    {
      type: 'checkbox',
      name: 'showNSFW',
      label: 'Show NSFW',
      defaultValue: false,
      admin: {
        position: 'sidebar',
      },
    },
  ],
};
