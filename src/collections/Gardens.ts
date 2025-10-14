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
import { Groups } from './groups';

export const Gardens: CollectionConfig<'gardens'> = {
  slug: 'gardens',
  access: RBAC('gardens'),
  labels: {
    singular: 'Garden',
    plural: 'Gardens',
  },
  trash: true,
  admin: {
    useAsTitle: 'name',
    group: Groups.misc,
    description: "Other things that don't have a spcecific home",
  },
  fields: [
    ...slugField('name'),
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Content',
          fields: [
            {
              name: 'name',
              type: 'text',
              required: true,
            },
            {
              name: 'featuredImage',
              type: 'upload',
              relationTo: 'media',
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
        },
        {
          label: 'SEO',
          name: 'meta',
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
