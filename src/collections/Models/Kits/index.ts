import { RBAC } from '@/access/RBAC';
import { CollectionConfig } from 'payload';

export const Kits: CollectionConfig<'kits'> = {
  slug: 'kits',
  access: RBAC('kits'),
  admin: {
    useAsTitle: 'full_title',
    group: 'Models',
    description: 'Model Kits',
  },
  fields: [
    {
      name: 'full_title',
      label: 'Full Title',
      type: 'text',
      required: true,
      admin: {
        readOnly: true,
        hidden: true,
      },
    },
    {
      name: 'title',
      type: 'text',
      required: true,
      label: 'Kit Title (as shown on box)',
    },
    {
      name: 'kit_number',
      type: 'text',
      required: true,
      label: "Manufacturer's Kit Number",
    },
    {
      name: 'year_released',
      label: 'Year released',
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
      name: 'models',
      type: 'join',
      collection: 'models',
      label: 'Models from kit',
      on: 'model_meta.kit',
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
    {
      name: 'boxart',
      label: 'Boxart',
      type: 'upload',
      relationTo: 'media',
      admin: {
        position: 'sidebar',
      },
    },
  ],
  hooks: {
    beforeChange: [
      async ({ data, req }) => {
        if (data?.manufacturer && data?.scale) {
          try {
            const manufacturer = await req.payload.findByID({
              collection: 'manufacturers',
              id: data.manufacturer,
            });

            const scale = await req.payload.findByID({
              collection: 'scales',
              id: data.scale,
            });

            if (manufacturer.title && scale.title) {
              data.full_title = `${manufacturer.title} ${scale.title} ${data.title}`;
            }
          } catch (error) {
            console.error('Error generating title:', error);
            data.full_title = data.title;
          }
        }

        return data;
      },
    ],
  },
};
