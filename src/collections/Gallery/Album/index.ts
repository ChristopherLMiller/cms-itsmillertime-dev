import { RBAC } from '@/access';
import { nsfwFilter } from '@/access/filters/nsfwFilter';
import { RBAC as RBACFunction } from '@/access/RBAC';
import { visibilityFilter } from '@/access/filters/visibilityFilter';
import { Groups } from '@/collections/shared/groups';
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
import { CollectionConfig, PayloadRequest } from 'payload';
import { allowAll } from '@/access/methods/allowAll';
import { allowedRoles } from '@/access/methods/allowedRoles';

export const GalleryAlbums: CollectionConfig<'gallery-albums'> = {
  slug: 'gallery-albums',
  access: {
    read: async ({ req }: { req: PayloadRequest }) => {
      const isPermitted = await allowAll();
      console.log(`[GalleryAlbums] read: ${isPermitted}`);
      if (!isPermitted) return false;
      const nsfwWhere = await nsfwFilter({ req });
      const visibilityWhere = await visibilityFilter({ req });
      console.log('[GalleryAlbums] read: where', nsfwWhere, visibilityWhere);
      const where = { and: [nsfwWhere, visibilityWhere] };
      console.log('[GalleryAlbums] read: where being returned', where);
      return where;
    },
    create: RBACFunction(allowedRoles(['admin'])),
    update: RBACFunction(allowedRoles(['admin'])),
    delete: RBACFunction(allowedRoles(['admin'])),
    readVersions: RBACFunction(allowedRoles(['admin'])),
    unlock: RBACFunction(allowedRoles(['admin'])),
    admin: RBACFunction(allowedRoles(['admin'])),
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
          type: 'select',
          hasMany: true,
          name: 'permittedRoles',
          options: [
            { label: 'Family', value: 'family' },
            { label: 'Friends', value: 'friend' },
            { label: 'Client', value: 'client' },
            { label: 'User', value: 'user' },
            { label: 'Admin', value: 'admin' },
          ],
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
};
