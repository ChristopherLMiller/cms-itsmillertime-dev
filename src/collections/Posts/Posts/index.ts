import { RBAC } from '@/access/RBAC';
import { Groups } from '@/collections/groups';
import { slugField } from '@/fields/slug';
import { lexicalToText } from '@/utilities/lexicalToText';
import {
  MetaDescriptionField,
  MetaImageField,
  MetaTitleField,
  OverviewField,
  PreviewField,
} from '@payloadcms/plugin-seo/fields';
import { lexicalEditor } from '@payloadcms/richtext-lexical';
import { CollectionConfig } from 'payload';

export const Posts: CollectionConfig<'posts'> = {
  slug: 'posts',
  access: RBAC('posts'),
  labels: {
    singular: 'Article',
    plural: 'Articles',
  },
  trash: true,
  defaultPopulate: {
    title: true,
    slug: true,
    meta: {
      image: true,
      description: true,
    },
  },
  admin: {
    defaultColumns: ['title', 'slug', 'updatedAt'],
    useAsTitle: 'title',
    description: 'Blog Posts',
    group: Groups.blog,
    enableRichTextLink: true,
  },
  fields: [
    {
      name: 'originalPublicationDate',
      type: 'date',
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
        position: 'sidebar',
      },
      hooks: {
        beforeChange: [
          ({ siblingData, value }) => {
            if (siblingData._status === 'published' && !value) {
              return new Date();
            }
            return value;
          },
        ],
      },
    },
    ...slugField('title'),
    {
      name: 'word_count',
      type: 'number',
      index: false,
      label: 'Word Count',
      admin: {
        position: 'sidebar',
        readOnly: true,
      },
      hooks: {
        beforeChange: [
          ({ siblingData }) => {
            const plainText = lexicalToText(siblingData?.content);
            const wordCount = plainText.split(/\s+/).filter(Boolean).length;
            return wordCount;
          },
        ],
      },
    },
    {
      name: 'category',
      type: 'relationship',
      admin: {
        position: 'sidebar',
      },
      relationTo: 'posts-categories',
    },
    {
      name: 'tags',
      type: 'relationship',
      relationTo: 'posts-tags',
      hasMany: true,
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'relatedPosts',
      type: 'relationship',
      admin: {
        position: 'sidebar',
      },
      filterOptions: ({ id }) => {
        return {
          id: {
            not_in: [id],
          },
        };
      },
      hasMany: true,
      relationTo: 'posts',
    },
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Content',
          fields: [
            {
              name: 'title',
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
