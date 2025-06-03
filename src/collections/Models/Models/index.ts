import { RBAC } from '@/access/RBAC';
import { slugField } from '@/fields/slug';
import {
  MetaDescriptionField,
  MetaImageField,
  MetaTitleField,
  OverviewField,
  PreviewField,
} from '@payloadcms/plugin-seo/fields';
import { lexicalEditor } from '@payloadcms/richtext-lexical';
import { CollectionConfig } from 'payload';

export const Models: CollectionConfig<'models'> = {
  slug: 'models',
  access: RBAC('models'),
  admin: {
    useAsTitle: 'title',
    group: 'Models',
    description: 'A built model, not to be confused with a kit',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      label: 'Model name',
    },
    ...slugField('title'),
    {
      type: 'group',
      name: 'model_meta',
      label: 'Model Meta',
      admin: {
        position: 'sidebar',
      },
      fields: [
        {
          name: 'status',
          type: 'select',
          options: [
            {
              label: 'Not Started',
              value: 'NOT_STARTED',
            },
            {
              label: 'In Progress',
              value: 'IN_PROGRESS',
            },
            {
              label: 'Completed',
              value: 'COMPLETED',
            },
          ],
          required: true,
        },
        {
          name: 'completionDate',
          type: 'date',
          admin: {
            date: {
              pickerAppearance: 'dayOnly',
            },
            condition: (siblingData) => {
              return siblingData?.model_meta.status === 'COMPLETED';
            },
          },
        },
        {
          name: 'kit',
          type: 'relationship',
          relationTo: 'kits',
          required: true,
        },
        {
          name: 'tags',
          type: 'relationship',
          relationTo: 'models-tags',
          hasMany: true,
          admin: {
            appearance: 'drawer',
          },
        },
        {
          name: 'clockify_project_id',
          label: 'Clockify Project ID',
          type: 'text',
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
              type: 'array',
              name: 'buildLog',
              label: 'Build Log',
              fields: [
                {
                  name: 'title',
                  type: 'text',
                  required: true,
                },
                {
                  name: 'content',
                  type: 'richText',
                  editor: lexicalEditor({
                    features: ({ rootFeatures }) => {
                      return [...rootFeatures];
                    },
                  }),
                },
              ],
              admin: {
                initCollapsed: true,
                components: {
                  RowLabel: {
                    path: '@/components/RowLabel#RowLabel',
                  },
                },
              },
            },
          ],
        },
        {
          label: 'Images',
          fields: [
            {
              type: 'upload',
              relationTo: 'media',
              name: 'image',

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
              overrides: {
                admin: {
                  allowCreate: true,
                },
              },
            }),
            PreviewField({
              hasGenerateFn: false,
              titlePath: 'meta.title',
              descriptionPath: 'meta.description',
            }),
          ],
        },
      ],
    },
  ],
};
