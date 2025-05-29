import { RBAC } from '@/access/RBAC';
import {
  FixedToolbarFeature,
  InlineToolbarFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical';

import { type CollectionConfig } from 'payload';
import { generateBlurHash } from './hooks/generateBlurHash';
import { generateEXIF } from './hooks/generateEXIF';

export const Media: CollectionConfig = {
  slug: 'media',
  admin: {
    group: 'Media Library',
    description: 'Media Items, images and otherwise',
    defaultColumns: ['alt', 'caption'],
  },
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
            condition: ({ siblingData }) => Boolean(!siblingData?.exif),
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
    withMetadata: true,
    formatOptions: {
      format: 'avif',
    },
    imageSizes: [
      {
        name: 'thumbnail',
        width: 300,
      },
      {
        name: 'square',
        width: 500,
        height: 500,
      },
      {
        name: 'small',
        width: 600,
      },
      {
        name: 'medium',
        width: 900,
      },
      {
        name: 'large',
        width: 1400,
      },
      {
        name: 'xlarge',
        width: 1920,
      },
      {
        name: 'og',
        width: 1200,
        height: 630,
        crop: 'center',
      },
    ],
  },
  hooks: {
    beforeChange: [generateEXIF],
    beforeValidate: [generateBlurHash],
  },
};
