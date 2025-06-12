import { Groups } from '@/collections/groups';
import { GlobalConfig } from 'payload';

export const SiteNavigation: GlobalConfig = {
  slug: 'site-navigation',
  admin: {
    group: Groups.global,
  },
  access: {
    read: () => true,
    update: () => true,
  },
  fields: [
    {
      name: 'navItems',
      label: 'Navigation Items',
      type: 'array',
      admin: {
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
          name: 'link',
          type: 'text',
          required: true,
        },
        {
          name: 'childNodes',
          type: 'array',
          admin: {
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
              name: 'link',
              type: 'text',
              required: true,
            },
            {
              name: 'order',
              label: 'Display Order',
              type: 'number',
              min: 0,
              defaultValue: 1,
              max: 100,
              required: true,
            },
            {
              name: 'icon',
              type: 'upload',
              relationTo: 'media',
            },
            {
              name: 'visibility',
              type: 'select',
              defaultValue: 'ALL',
              required: true,
              options: [
                {
                  value: 'ALL',
                  label: 'Anybody',
                },
                {
                  value: 'AUTHENTICATED',
                  label: 'Logged In',
                },
                {
                  value: 'ANONYMOUS',
                  label: 'Not Logged In',
                },
                {
                  value: 'PRIVILEGED',
                  label: 'By User or Role',
                },
              ],
            },
            {
              type: 'relationship',
              relationTo: 'roles',
              hasMany: true,
              name: 'allowedRoles',
              admin: {
                condition: (siblingData) => {
                  return siblingData?.visibility === 'PRIVILEGED';
                },
              },
            },
            {
              type: 'relationship',
              relationTo: 'users',
              hasMany: true,
              name: 'allowedUsers',
              admin: {
                condition: (siblingData) => {
                  return siblingData?.visibility === 'PRIVILEGED';
                },
              },
            },
          ],
        },
        {
          name: 'order',
          label: 'Display Order',
          type: 'number',
          min: 0,
          defaultValue: 1,
          max: 100,
          required: true,
        },
        {
          name: 'icon',
          type: 'upload',
          relationTo: 'media',
        },
        {
          name: 'visibility',
          type: 'select',
          defaultValue: 'ALL',
          required: true,
          options: [
            {
              value: 'ALL',
              label: 'Anybody',
            },
            {
              value: 'AUTHENTICATED',
              label: 'Logged In',
            },
            {
              value: 'ANONYMOUS',
              label: 'Not Logged In',
            },
            {
              value: 'PRIVILEGED',
              label: 'By User or Role',
            },
          ],
        },
        {
          type: 'relationship',
          relationTo: 'roles',
          hasMany: true,
          name: 'allowedRoles',
          admin: {
            condition: (siblingData) => {
              return siblingData?.visibility === 'PRIVILEGED';
            },
          },
        },
        {
          type: 'relationship',
          relationTo: 'users',
          hasMany: true,
          name: 'allowedUsers',
          admin: {
            condition: (siblingData) => {
              return siblingData?.visibility === 'PRIVILEGED';
            },
          },
        },
      ],
    },
  ],
};
