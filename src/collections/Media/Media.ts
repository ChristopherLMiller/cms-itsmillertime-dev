import { RBAC } from '@/access/RBAC';
import {
  FixedToolbarFeature,
  InlineToolbarFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical';

import { type CollectionConfig } from 'payload';
import { Groups } from '../groups';
import { generateBlurHash } from './hooks/generateBlurHash';
import { generateEXIF } from './hooks/generateEXIF';

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
        {
          label: 'EXIF',
          fields: [
            {
              name: 'exif',
              type: 'json',
              admin: {
                readOnly: true,
              },
            },
          ],
          admin: {
            condition: ({ siblingData }) => Boolean(siblingData?.exif !== null),
          },
        },
      ],
    },
    {
      name: 'blurhash',
      type: 'text',
      admin: {
        hidden: true,
        disableListColumn: true,
        disableListFilter: true,
      },
    },
  ],
  upload: {
    disableLocalStorage: true,
    adminThumbnail: 'thumbnail',
    focalPoint: true,
    displayPreview: true,
    withMetadata: true,
    pasteURL: {
      allowList: [
        {
          hostname: 'images.itsmillertime.dev',
        },
      ],
    },
    formatOptions: {
      format: 'avif',
    },
    imageSizes: [
      {
        name: 'thumbnail',
        width: 300,
        formatOptions: {
          format: 'jpg',
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
        },
      },
      {
        name: 'medium',
        width: 900,
        formatOptions: {
          format: 'avif',
        },
      },
      {
        name: 'large',
        width: 1400,
        formatOptions: {
          format: 'avif',
        },
      },
      {
        name: 'xlarge',
        width: 1920,
        formatOptions: {
          format: 'avif',
        },
      },
      {
        name: 'og',
        width: 1200,
        height: 630,
        crop: 'center',
        formatOptions: {
          format: 'jpg',
        },
      },
    ],
  },
  hooks: {
    beforeChange: [generateEXIF],
    beforeValidate: [generateBlurHash],
  },
};
