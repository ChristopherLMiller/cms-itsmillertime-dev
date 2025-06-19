import { RBAC } from '@/access/RBAC';
import { Groups } from '@/collections/groups';
import { clockifyProjectField } from '@/fields/clockifyProject';
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
  labels: {
    singular: 'Model',
    plural: 'Models',
  },
  admin: {
    useAsTitle: 'title',
    group: Groups.models,
    description: 'A built model, not to be confused with a kit',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      label: 'Model name',
      hooks: {
        beforeChange: [
          async ({ data, req, value }) => {
            if (data?.title === undefined || data?.title === '') {
              const kit = await req.payload.findByID({
                collection: 'kits',
                id: data?.model_meta?.kit,
              });

              if (kit?.title) {
                return kit.full_title;
              }
            } else {
              return value;
            }
          },
        ],
      },
    },
    ...slugField('title'),
    clockifyProjectField,
    {
      type: 'group',
      name: 'model_meta',
      label: 'Model Meta',
      admin: {
        position: 'sidebar',
      },
      fields: [
        {
          name: 'featuredImage',
          type: 'upload',
          relationTo: 'media',
          required: true,
        },
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
          name: 'videos',
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
              name: 'title',
              type: 'text',
              required: true,
            },
            {
              name: 'url',
              type: 'text',
              label: 'Video URL',
            },
          ],
        },
      ],
    },
    {
      type: 'group',
      name: 'relatedResources',
      label: 'Related Resources',
      admin: {
        position: 'sidebar',
      },
      fields: [
        {
          name: 'relatedPosts',
          type: 'relationship',
          hasMany: true,
          relationTo: 'posts',
        },
        {
          name: 'relatedModels',
          type: 'relationship',
          hasMany: true,
          relationTo: 'models',
          filterOptions: ({ id }) => {
            return {
              id: {
                not_in: [id],
              },
            };
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
