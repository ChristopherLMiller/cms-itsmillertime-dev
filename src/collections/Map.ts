import { RBAC } from '@/access/RBAC';
import { allowAll } from '@/access/methods/allowAll';
import { allowedRoles } from '@/access/methods/allowedRoles';
import { CollectionConfig } from 'payload';
import { Groups } from './shared/groups';

export const MapMarkers: CollectionConfig<'map-markers'> = {
  slug: 'map-markers',
  access: {
    read: RBAC(allowAll(), [], 'map-markers', 'read'),
    create: RBAC(allowedRoles(['admin']), [], 'map-markers', 'create'),
    update: RBAC(allowedRoles(['admin']), [], 'map-markers', 'update'),
    delete: RBAC(allowedRoles(['admin']), [], 'map-markers', 'delete'),
    readVersions: RBAC(allowedRoles(['admin']), [], 'map-markers', 'readVersions'),
    unlock: RBAC(allowedRoles(['admin']), [], 'map-markers', 'unlock'),
    admin: RBAC(allowedRoles(['admin']), [], 'map-markers', 'admin'),
  },
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
      admin: {
        initCollapsed: true,
        components: {
          RowLabel: {
            path: '@/components/RowLabel#RowLabel',
          },
        },
      },
      fields: [
        {
          name: 'title',
          type: 'text',
          required: true,
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
