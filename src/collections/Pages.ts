import { RBAC } from '@/access';
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
import { Groups } from './shared/groups';

export const Pages: CollectionConfig<'pages'> = {
  slug: 'pages',
  access: {
    read: RBAC().allowAll().result(),
    create: RBAC().allowedRoles(['admin']).result(),
    update: RBAC().allowedRoles(['admin']).result(),
    delete: RBAC().allowedRoles(['admin']).result(),
    readVersions: RBAC().allowedRoles(['admin']).result(),
    unlock: RBAC().allowedRoles(['admin']).result(),
    admin: RBAC().allowedRoles(['admin']).result(),
  },
  labels: {
    singular: 'Page',
    plural: 'Pages',
  },
  admin: {
    enableRichTextLink: true,
    defaultColumns: ['title', 'slug', 'updatedAt'],
    useAsTitle: 'title',
    group: Groups.pages,
    description: 'Singular dynamic page of the front end',
    components: {
      edit: {
        beforeDocumentControls: [
          {
            path: '@/components/PreviewButton#PreviewButton',
          },
        ],
      },
    },
  },
  trash: true,
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
              hasGenerateFn: true,
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
