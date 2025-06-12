import { RBAC } from '@/access/RBAC';
import { CollectionConfig } from 'payload';
import { Groups } from './groups';

export const MapMarkers: CollectionConfig<'map-markers'> = {
  slug: 'map-markers',
  access: RBAC('map-markers'),
  admin: {
    useAsTitle: 'title',
    group: Groups.misc,
    description: 'Map markers, used for plotting points of interest',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      type: 'point',
      name: 'location',
      required: true,
    },
    {
      type: 'number',
      name: 'visits',
      required: false,
      defaultValue: 0,
    },
    {
      type: 'number',
      name: 'rating',
      required: false,
      min: 0,
      max: 5,
      admin: {
        step: 0.5,
      },
    },
    {
      type: 'array',
      name: 'links',
      fields: [
        {
          name: 'title',
          type: 'text',
        },
        {
          type: 'relationship',
          relationTo: ['gallery-albums'],
          name: 'album',
        },
        {
          type: 'text',
          name: 'url',
        },
      ],
    },
  ],
};
