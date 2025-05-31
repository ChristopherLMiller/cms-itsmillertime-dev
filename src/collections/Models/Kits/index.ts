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
      name: 'kit_number',
      type: 'text',
      required: true,
      label: "Manufacturer's Kit Number",
    },
    {
      name: 'year_released',
      type: 'number',
      required: true,
      defaultValue: new Date().getFullYear(),
    },
    {
      name: 'scalemates',
      type: 'text',
      label: 'Scalemates link',
    },
    {
      name: 'manufacturer',
      type: 'relationship',
      relationTo: 'manufacturers',
      required: true,
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'scale',
      type: 'relationship',
      relationTo: 'scales',
      required: true,
      admin: {
        position: 'sidebar',
      },
    },
  ],
};
