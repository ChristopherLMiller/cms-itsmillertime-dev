import { RBAC } from '@/access/RBAC';
import { type CollectionConfig } from 'payload';
import { Groups } from '../groups';
import { imageContentFields, imageTechnicalFields } from '../shared/imageFields';
import { baseUploadConfig } from '../shared/uploadConfig';
import { defaultAltText } from '../shared/defaultAltText';
import { generateBlurHash } from '../shared/generateBlurHash';
import { generateEXIF } from '../shared/generateEXIF';

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
    ...imageTechnicalFields,
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Content',
          fields: imageContentFields,
        },
        {
          label: 'Related Resources',
          fields: [
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
  upload: baseUploadConfig,
  hooks: {
    afterChange: [generateEXIF],
    beforeValidate: [defaultAltText, generateBlurHash],
  },
};
