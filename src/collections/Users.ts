import type { CollectionConfig } from 'payload';

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
    group: 'Authentication & Authorization',
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
  ],
};
