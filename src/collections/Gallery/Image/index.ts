import { RBAC } from '@/access/RBAC';
import { nsfwFilter } from '@/access/RBAC/filters/nsfw';
import { visibilityFilter } from '@/access/RBAC/filters/visibility';
import { Groups } from '@/collections/groups';
import { slugField } from '@/fields/slug';
import {
  MetaDescriptionField,
  MetaImageField,
  MetaTitleField,
  OverviewField,
  PreviewField,
} from '@payloadcms/plugin-seo/fields';
import {
  FixedToolbarFeature,
  HeadingFeature,
  HorizontalRuleFeature,
  InlineToolbarFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical';
import { type CollectionConfig } from 'payload';

export const GalleryImages: CollectionConfig<'gallery-images'> = {
  slug: 'gallery-images',
  admin: {
    group: Groups.galleries,
    description: 'Image',
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', 'gallery-tags'],
  },
  labels: {
    singular: 'Image',
    plural: 'Images',
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
              name: 'content',
              type: 'richText',
              editor: lexicalEditor({
                features: ({ rootFeatures }) => {
                  return [
                    ...rootFeatures,
                    HeadingFeature({ enabledHeadingSizes: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] }),
                    FixedToolbarFeature(),
                    InlineToolbarFeature(),
                    HorizontalRuleFeature(),
                  ];
                },
              }),
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
            MetaDescriptionField({
              hasGenerateFn: true,
            }),
            MetaImageField({
              hasGenerateFn: true,
              relationTo: 'media',
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
