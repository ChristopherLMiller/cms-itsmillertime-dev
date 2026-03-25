import { nsfwFilter } from '@/access/filters/nsfwFilter';
import { Groups } from '@/collections/shared/groups';
import { imageContentFields, imageTechnicalFields } from '@/collections/shared/imageFields';
import { baseUploadConfig } from '@/collections/shared/uploadConfig';
import { PayloadRequest, slugField } from 'payload';
import {
  MetaDescriptionField,
  MetaImageField,
  MetaTitleField,
  OverviewField,
  PreviewField,
} from '@payloadcms/plugin-seo/fields';
import { RBAC } from '@/access/RBAC';
import { type CollectionConfig } from 'payload';
import { generateEXIF } from '@/collections/shared/generateEXIF';
import { generateBlurHash } from '@/collections/shared/generateBlurHash';
import { defaultAltText } from '@/collections/shared/defaultAltText';
import { visibilityFilter } from '@/access/filters/visibilityFilter';
import { allowAll } from '@/access/methods/allowAll';
import { allowedRoles } from '@/access/methods/allowedRoles';

export const GalleryImages: CollectionConfig<'gallery-images'> = {
  slug: 'gallery-images',
  admin: {
    group: Groups.galleries,
    description: 'Image',
    useAsTitle: 'alt',
    defaultColumns: ['title', 'slug', 'gallery-tags'],
  },
  labels: {
    singular: 'Image',
    plural: 'Images',
  },
  folders: false,
  access: {
    read: RBAC(allowAll(), [nsfwFilter, visibilityFilter], 'gallery-images', 'read'),
    create: RBAC(allowedRoles(['admin']), [], 'gallery-images', 'create'),
    update: RBAC(allowedRoles(['admin']), [], 'gallery-images', 'update'),
    delete: RBAC(allowedRoles(['admin']), [], 'gallery-images', 'delete'),
    readVersions: RBAC(allowedRoles(['admin']), [], 'gallery-images', 'readVersions'),
    unlock: RBAC(allowedRoles(['admin']), [], 'gallery-images', 'unlock'),
    admin: RBAC(allowedRoles(['admin']), [], 'gallery-images', 'admin'),
  },
  upload: baseUploadConfig,
  fields: [
    {
      type: 'group',
      name: 'settings',
      label: 'Settings',
      admin: {
        position: 'sidebar',
      },
      fields: [
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
          type: 'select',
          options: [
            { label: 'Family', value: 'family' },
            { label: 'Friends', value: 'friend' },
            { label: 'Client', value: 'client' },
            { label: 'User', value: 'user' },
            { label: 'Admin', value: 'admin' },
          ],
          hasMany: true,
          name: 'permittedRoles',
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
    ...imageTechnicalFields,
    {
      type: 'group',
      name: 'tracking',
      label: 'Image Meta',
      admin: {
        position: 'sidebar',
      },
      fields: [
        {
          name: 'views',
          type: 'number',
          defaultValue: 0,
          admin: {
            readOnly: true,
          },
        },
        {
          name: 'downloads',
          type: 'number',
          defaultValue: 0,
          admin: {
            readOnly: true,
          },
        },
        {
          name: 'likes',
          type: 'number',
          defaultValue: 0,
          admin: {
            readOnly: true,
          },
        },
        {
          name: 'dislikes',
          type: 'number',
          defaultValue: 0,
          admin: {
            readOnly: true,
          },
        },
        {
          name: 'comments',
          type: 'number',
          defaultValue: 0,
          admin: {
            readOnly: true,
          },
        },
        {
          name: 'shares',
          type: 'number',
          defaultValue: 0,
          admin: {
            readOnly: true,
          },
        },
      ],
    },
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Content',
          fields: [
            ...imageContentFields,

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
            MetaDescriptionField({
              hasGenerateFn: true,
            }),
            MetaImageField({
              hasGenerateFn: true,
              relationTo: 'gallery-images',
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
  hooks: {
    afterChange: [generateEXIF],
    beforeValidate: [defaultAltText, generateBlurHash],
  },
};
