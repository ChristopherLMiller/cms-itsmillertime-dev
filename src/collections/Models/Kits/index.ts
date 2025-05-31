import { RBAC } from '@/access/RBAC';
import { CollectionConfig } from 'payload';

export const Kits: CollectionConfig<'kits'> = {
  slug: 'kits',
  access: RBAC('kits'),
  admin: {
    useAsTitle: 'title',
    group: 'Models',
    description: 'Model Kits',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'manufacturer',
      type: 'relationship',
      relationTo: 'manufacturers',
      required: true,
    },
    {
      name: 'scale',
      type: 'relationship',
      relationTo: 'scales',
      required: true,
    },
  ],
};
