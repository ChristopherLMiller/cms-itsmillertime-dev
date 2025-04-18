import { RBAC } from '@/access/RBAC';
import { slugField } from '@/fields/slug';
import { wordCountField } from '@/fields/wordCount';
import {
  MetaDescriptionField,
  MetaImageField,
  MetaTitleField,
  OverviewField,
  PreviewField,
} from '@payloadcms/plugin-seo/fields';
import {
  convertLexicalToMarkdown,
  editorConfigFactory,
  FixedToolbarFeature,
  HeadingFeature,
  HorizontalRuleFeature,
  InlineToolbarFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical';
import { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical';
import { CollectionConfig, RichTextField } from 'payload';

export const Posts: CollectionConfig<'posts'> = {
  slug: 'posts',
  access: RBAC('posts'),
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
    group: 'Blog',
  },
  fields: [
    {
      name: 'publishedAt',
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
    ...wordCountField('content'),
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
              name: 'markdown',
              type: 'textarea',
              admin: {
                hidden: true,
              },
              hooks: {
                afterRead: [
                  ({ siblingData, siblingFields }) => {
                    const data: SerializedEditorState = siblingData['content'];

                    if (!data) {
                      return '';
                    }

                    const markdown = convertLexicalToMarkdown({
                      data,
                      editorConfig: editorConfigFactory.fromField({
                        field: siblingFields.find(
                          (field) => 'name' in field && field.name === 'content',
                        ) as RichTextField,
                      }),
                    });

                    return markdown;
                  },
                ],
              },
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
            MetaImageField({
              relationTo: 'media',
            }),
            MetaDescriptionField({
              hasGenerateFn: true,
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
