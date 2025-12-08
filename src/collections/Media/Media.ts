import { RBAC } from '@/access/RBAC';
import {
  FixedToolbarFeature,
  InlineToolbarFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical';

import { type CollectionConfig } from 'payload';
import { Groups } from '../groups';
import { generateBlurHash } from './hooks/generateBlurHash';

export const Media: CollectionConfig = {
  slug: 'media',
  admin: {
    group: Groups.media,
    description: 'Media Items, images and otherwise',
    defaultColumns: ['alt', 'caption'],
  },
  defaultPopulate: {
    exif: false,
  },
  folders: true,
  access: RBAC('media'),
  fields: [
    {
      name: 'exif',
      type: 'json',
      admin: {
        position: 'sidebar',
        readOnly: true,
        components: {
          Field: {
            path: '@/components/EXIFDisplay#EXIFDisplay',
          },
          Cell: {
            path: '@/components/EXIFCell#EXIFCell',
          },
        },
      },
    },
    {
      name: 'blurhash',
      type: 'text',
      admin: {
        position: 'sidebar',
        disableListColumn: true,
        disableListFilter: true,
        components: {
          Field: {
            path: '@/components/BlurhashField#BlurhashField',
          },
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
              name: 'alt',
              type: 'text',
              required: true,
            },
            {
              name: 'caption',
              type: 'richText',
              editor: lexicalEditor({
                features: ({ rootFeatures }) => {
                  return [...rootFeatures, FixedToolbarFeature(), InlineToolbarFeature()];
                },
              }),
            },
          ],
        },
        {
          label: 'Related Resources',
          fields: [
            {
              type: 'join',
              collection: ['gallery-images'],
              on: 'image',
              name: 'gallery-images',
              label: 'Gallery Images',
              admin: {
                allowCreate: false,
              },
            },
            {
              type: 'join',
              collection: ['posts'],
              on: 'featuredImage',
              name: 'relatedPosts',
              label: 'Posts',
              admin: {
                allowCreate: false,
              },
            },
          ],
        },
      ],
    },
  ],
  upload: {
    disableLocalStorage: true,
    adminThumbnail: 'thumbnail',
    cacheTags: true,
    focalPoint: true,
    displayPreview: true,
    withMetadata: true,
    pasteURL: undefined,
    imageSizes: [
      {
        name: 'thumbnail',
        width: 300,
        formatOptions: {
          format: 'jpg',
          options: {
            quality: 80,
          },
        },
      },
      {
        name: 'square',
        width: 500,
        height: 500,
      },
      {
        name: 'small',
        width: 600,
        formatOptions: {
          format: 'avif',
          options: {
            quality: 65,
            effort: 3,
          },
        },
      },
      {
        name: 'medium',
        width: 900,
        formatOptions: {
          format: 'avif',
          options: {
            quality: 70,
            effort: 3,
          },
        },
      },
      {
        name: 'large',
        width: 1400,
        formatOptions: {
          format: 'avif',
          options: {
            quality: 75,
            effort: 4,
          },
        },
      },
      {
        name: 'xlarge',
        width: 1920,
        formatOptions: {
          format: 'avif',
          options: {
            quality: 80,
            effort: 4,
          },
        },
      },
      {
        name: 'og',
        width: 1200,
        height: 630,
        crop: 'center',
        formatOptions: {
          format: 'jpg',
          options: {
            quality: 85,
          },
        },
      },
    ],
  },
  hooks: {
    afterChange: [
      async ({ req, doc, operation }) => {
        // Only run if its create or update
        if (operation === 'create' || operation === 'update') {
          if (doc.mimeType && doc.mimeType.startsWith('image/')) {
            console.log(`Generating EXIF for image ${doc.id}`);
            await req.payload.jobs.queue({
              task: 'generateImageEXIF',
              queue: 'metadata',
              input: {
                imageId: doc.id,
              },
            });
          }
        }
      },
    ],
    beforeValidate: [generateBlurHash],
  },
};
