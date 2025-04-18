import { RBAC } from '@/access/RBAC';
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
    defaultColumns: ['title', 'slug', 'gallery-tags', 'selling_is_nsfw', 'visibility'],
  },
  access: RBAC('gallery-images'),
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
              label: 'Logged Out',
            },
            {
              value: 'PRIVILEGED',
              label: 'By User Role',
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
            condition: ({ siblingData }) => {
              return siblingData?.visibility === 'PRIVILEGED';
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
            },
            {
              type: 'upload',
              relationTo: 'media',
              name: 'image',
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
              hasGenerateFn: true,
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
