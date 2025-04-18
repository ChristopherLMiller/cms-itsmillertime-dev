import { RBAC } from '@/access/RBAC';
import {
  FixedToolbarFeature,
  InlineToolbarFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical';
import exifParser from 'exif-parser';
import { type CollectionConfig } from 'payload';

export const Media: CollectionConfig = {
  slug: 'media',
  admin: {
    group: 'Media Library',
    description: 'Media Items, images and otherwise',
    defaultColumns: ['alt', 'caption', 'media-tags'],
  },
  access: RBAC('media'),
  fields: [
    {
      name: 'media-tags',
      type: 'relationship',
      relationTo: 'media-tags',
      hasMany: true,
      admin: {
        position: 'sidebar',
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
  ],
  upload: {
    disableLocalStorage: true,
    adminThumbnail: 'thumbnail',
    focalPoint: true,
    withMetadata: true,
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
    beforeChange: [
      async ({ data, req }) => {
        // Check if we have an uploaded file
        if (req?.file) {
          try {
            const uploadedFile = req.file;

            // Verify that this is an image that might have EXIF data
            if (!uploadedFile.mimetype || !uploadedFile.mimetype.startsWith('image/')) {
              return data;
            }

            // Access the file buffer directly
            const buffer = uploadedFile.data;

            const parser = exifParser.create(buffer);
            const result = parser.parse();

            return {
              ...data,
              exif: result,
            };
          } catch (error) {
            console.error('Error extracting EXIF data:', error);
            return data;
          }
        }

        return data;
      },
    ],
  },
};
