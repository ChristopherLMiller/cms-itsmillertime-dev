import { RBAC } from '@/access/RBAC';
import { allowAll } from '@/access/methods/allowAll';
import { allowedRoles } from '@/access/methods/allowedRoles';
import { Groups } from '@/collections/shared/groups';
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
import {
  removePostFromRelatedModelsOnDelete,
  syncRelatedModelsOnPostChange,
} from './hooks/syncRelatedModels';

/** Autosave interval slow enough to avoid racing keystrokes in title/text fields. */
const AUTOSAVE_INTERVAL_MS = 2000;

export const Posts: CollectionConfig<'posts'> = {
  slug: 'posts',
  access: {
    read: RBAC(allowAll(), [], 'posts', 'read'),
    create: RBAC(allowedRoles(['admin']), [], 'posts', 'create'),
    update: RBAC(allowedRoles(['admin']), [], 'posts', 'update'),
    delete: RBAC(allowedRoles(['admin']), [], 'posts', 'delete'),
    readVersions: RBAC(allowedRoles(['admin']), [], 'posts', 'readVersions'),
    unlock: RBAC(allowedRoles(['admin']), [], 'posts', 'unlock'),
    admin: RBAC(allowedRoles(['admin']), [], 'posts', 'admin'),
  },
  labels: {
    singular: 'Article',
    plural: 'Articles',
  },
  enableQueryPresets: true,
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
      name: 'relatedModels',
      type: 'relationship',
      label: 'Related Models',
      admin: {
        position: 'sidebar',
        description: 'Link models from this article. Also editable from the model.',
      },
      hasMany: true,
      relationTo: 'models',
    },
    {
      name: 'relatedAlbums',
      type: 'relationship',
      label: 'Related Photo Galleries',
      admin: {
        position: 'sidebar',
        description:
          'Link photo gallery albums to this article. Shown on the album as Related Articles.',
      },
      hasMany: true,
      relationTo: 'gallery-albums',
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
              name: 'subheading',
              type: 'text',
              required: false,
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
        interval: AUTOSAVE_INTERVAL_MS,
      },
      schedulePublish: true,
    },
    maxPerDoc: 5,
  },
  hooks: {
    afterChange: [syncRelatedModelsOnPostChange],
    afterDelete: [removePostFromRelatedModelsOnDelete],
  },
};
