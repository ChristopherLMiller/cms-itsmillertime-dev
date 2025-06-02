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

const defaultTitleValue = '[Auto-generated from kit]';

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
      defaultValue: defaultTitleValue,
      validate: (val: any, { data }: any) => {
        // Allow empty title if kit is selected (it will be auto-populated)
        if (!val && data?.kit) {
          return true;
        }
        // Otherwise, require title
        if (!val) {
          return 'Model name is required';
        }
        return true;
      },
    },
    {
      type: 'group',
      name: 'meta',
      label: 'Model Meta',
      admin: {
        position: 'sidebar',
      },
      fields: [
        ...slugField('title'),
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
          defaultValue: 'NOT_STARTED',
        },
        {
          name: 'completionDate',
          type: 'date',
          admin: {
            date: {
              pickerAppearance: 'dayOnly',
            },
            position: 'sidebar',
            condition: (siblingData) => {
              return siblingData?.status === 'COMPLETED';
            },
          },
        },
        {
          name: 'kit',
          type: 'relationship',
          relationTo: 'kits',
          required: true,
          admin: {
            position: 'sidebar',
          },
        },
        {
          name: 'clockify_project_id',
          label: 'Clockify Project ID',
          type: 'text',
          admin: {
            position: 'sidebar',
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
              type: 'array',
              name: 'buildLog',
              label: 'Build Log',
              fields: [
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
  hooks: {
    beforeChange: [
      async ({ data, req }) => {
        if ((!data.title || data.title === defaultTitleValue) && data?.kit) {
          try {
            const kit = await req.payload.findByID({
              collection: 'kits',
              id: data.kit,
            });

            if (kit?.full_title) {
              data.title = kit.full_title;
            }
          } catch (error) {
            console.log('Unable to generate title: ', error);
          }
        }
        return data;
      },
    ],
  },
};
