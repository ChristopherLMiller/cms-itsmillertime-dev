import { RBAC } from '@/access/RBAC';
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
import { Groups } from './groups';

export const Pages: CollectionConfig<'pages'> = {
  slug: 'pages',
  access: RBAC('pages'),
  admin: {
    defaultColumns: ['title', 'slug', 'updatedAt'],
    useAsTitle: 'title',
    group: Groups.pages,
    description: 'Singular dynamic page of the front end',
  },
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'title',
          type: 'text',
          required: true,
        },
      ],
    },
    ...slugField('title'),
    {
      type: 'select',
      name: 'visibility',
      defaultValue: 'ALL',
      admin: {
        position: 'sidebar',
      },
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
        condition: (siblingData) => {
          return siblingData?.visibility === 'PRIVILEGED';
        },
      },
    },
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Content',
          fields: [
            {
              name: 'blocks',
              type: 'array',
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
                  name: 'block',
                  type: 'richText',
                  editor: lexicalEditor({
                    features: ({ rootFeatures }) => {
                      return [
                        ...rootFeatures,
                        HeadingFeature({ enabledHeadingSizes: ['h2', 'h3', 'h4', 'h5', 'h6'] }),
                        FixedToolbarFeature(),
                        InlineToolbarFeature(),
                        HorizontalRuleFeature(),
                      ];
                    },
                  }),
                },
              ],
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
            MetaDescriptionField({}),
            MetaImageField({
              relationTo: 'media',
            }),
            PreviewField({
              titlePath: 'meta.title',
              descriptionPath: 'meta.description',
            }),
          ],
        },
      ],
    },
  ],
  versions: {
    drafts: {
      autosave: {
        interval: 100,
      },
      schedulePublish: true,
    },
    maxPerDoc: 5,
  },
};
