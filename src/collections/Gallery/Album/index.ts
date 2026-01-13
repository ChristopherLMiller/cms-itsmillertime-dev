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
import { CollectionConfig } from 'payload';

export const GalleryAlbums: CollectionConfig<'gallery-albums'> = {
  slug: 'gallery-albums',
  access: {
    create: RBAC('gallery-albums').create,
    read: RBAC('gallery-albums').applyFilters('read', [nsfwFilter, visibilityFilter]),
    update: RBAC('gallery-albums').update,
    delete: RBAC('gallery-albums').remove,
    readVersions: RBAC('gallery-albums').readVersions,
    unlock: RBAC('gallery-albums').unlock,
    admin: RBAC('gallery-albums').admin,
  },
  labels: {
    singular: 'Album',
    plural: 'Albums',
  },
  admin: {
    group: Groups.galleries,
    description: 'Listing of all photo albums',
    useAsTitle: 'title',
  },
  fields: [
    ...slugField('title'),
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
          name: 'category',
          type: 'relationship',
          relationTo: 'gallery-categories',
          admin: {
            position: 'sidebar',
          },
        },
        {
          name: 'tags',
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
      name: 'tracking',
      label: 'Album Meta',
      admin: {
        position: 'sidebar',
      },
      fields: [
        {
          name: 'views',
          type: 'number',
          admin: {
            readOnly: true,
          },
        },
        {
          name: 'downloads',
          type: 'number',
          admin: {
            readOnly: true,
          },
        },
        {
          name: 'likes',
          type: 'number',
          admin: {
            readOnly: true,
          },
        },
        {
          name: 'dislikes',
          type: 'number',
          admin: {
            readOnly: true,
          },
        },
        {
          name: 'comments',
          type: 'number',
          admin: {
            readOnly: true,
          },
        },
        {
          name: 'shares',
          type: 'number',
          admin: {
            readOnly: true,
          },
        },
        {
          name: 'totalImages',
          type: 'number',
          admin: {
            readOnly: true,
          },
          hooks: {
            beforeChange: [
              ({ data }) => {
                return data?.images?.docs?.length || 0;
              },
            ],
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
              name: 'images',
              type: 'join',
              collection: 'gallery-images',
              on: 'albums',
              hasMany: true,
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
