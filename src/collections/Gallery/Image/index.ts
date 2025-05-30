import { RBAC } from '@/access/RBAC';
import { nsfwFilter } from '@/access/RBAC/filters/nsfw';
import { visibilityFilter } from '@/access/RBAC/filters/visibility';
import { slugField } from '@/fields/slug';
import {
  MetaDescriptionField,
  MetaImageField,
  MetaTitleField,
  OverviewField,
  PreviewField,
} from '@payloadcms/plugin-seo/fields';
import { type CollectionConfig } from 'payload';

export const GalleryImages: CollectionConfig<'gallery-images'> = {
  slug: 'gallery-images',
  admin: {
    group: 'Gallery',
    description: 'Image',
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', 'gallery-tags'],
  },
  access: {
    create: RBAC('gallery-images').create,
    read: RBAC('gallery-images').applyFilters('read', [nsfwFilter, visibilityFilter]),
    update: RBAC('gallery-images').update,
    delete: RBAC('gallery-images').remove,
    readVersions: RBAC('gallery-images').readVersions,
    unlock: RBAC('gallery-images').unlock,
    admin: RBAC('gallery-images').admin,
  },
  fields: [
    {
      type: 'group',
      name: 'settings',
      label: 'Settings',
      admin: {
        position: 'sidebar',
      },
      fields: [
        ...slugField('title'),
        {
          name: 'isNsfw',
          type: 'checkbox',
          defaultValue: false,
          label: 'Is NSFW?',
        },
        {
          name: 'gallery-tags',
          label: 'Tags',
          type: 'relationship',
          relationTo: 'gallery-tags',
          hasMany: true,
          admin: {
            position: 'sidebar',
          },
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
            position: 'sidebar',
            condition: (siblingData) => {
              return siblingData?.settings?.visibility === 'PRIVILEGED';
            },
          },
        },
        {
          type: 'relationship',
          relationTo: 'users',
          hasMany: true,
          name: 'allowedUsers',
          admin: {
            position: 'sidebar',
            condition: (siblingData) => {
              return siblingData?.settings?.visibility === 'PRIVILEGED';
            },
          },
        },
      ],
    },
    {
      type: 'group',
      name: 'selling',
      label: 'Product Listing',
      admin: {
        position: 'sidebar',
      },
      fields: [
        {
          type: 'checkbox',
          name: 'isSellable',
          defaultValue: false,
          label: 'Is Sellable?',
        },
      ],
    },

    {
      type: 'tabs',
      tabs: [
        {
          label: 'Content',
          fields: [
            {
              type: 'text',
              name: 'title',
              label: 'Title',
              required: true,
            },
            {
              type: 'upload',
              relationTo: 'media',
              name: 'image',
              required: true,
            },
            {
              name: 'albums',
              type: 'relationship',
              hasMany: true,
              relationTo: 'gallery-albums',
            },
          ],
        },
        {
          name: 'meta',
          label: 'SEO',
          fields: [
            OverviewField({
              titlePath: 'meta.title',
              descriptionPath: 'meta.description',
              imagePath: 'meta.image',
            }),
            MetaTitleField({
              hasGenerateFn: true,
            }),
            MetaImageField({
              relationTo: 'media',
            }),
            MetaDescriptionField({
              hasGenerateFn: false,
            }),
            PreviewField({
              hasGenerateFn: true,
              titlePath: 'meta.title',
              descriptionPath: 'meta.description',
            }),
          ],
        },
      ],
    },
  ],
};
