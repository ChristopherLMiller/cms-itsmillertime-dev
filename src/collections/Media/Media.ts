import { type CollectionConfig } from 'payload';
import { Groups } from '../shared/groups';
import { imageContentFields, imageTechnicalFields } from '../shared/imageFields';
import { baseUploadConfig } from '../shared/uploadConfig';
import { defaultAltText } from '../shared/defaultAltText';
import { generateBlurHash } from '../shared/generateBlurHash';
import { generateEXIF } from '../shared/generateEXIF';
import { RBAC } from '@/access/RBAC';
import { allowAll } from '@/access/methods/allowAll';
import { allowedRoles } from '@/access/methods/allowedRoles';

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
  access: {
    read: RBAC(allowAll(), [], 'media', 'read'),
    create: RBAC(allowedRoles(['admin']), [], 'media', 'create'),
    update: RBAC(allowedRoles(['admin']), [], 'media', 'update'),
    delete: RBAC(allowedRoles(['admin']), [], 'media', 'delete'),
    readVersions: RBAC(allowedRoles(['admin']), [], 'media', 'readVersions'),
    unlock: RBAC(allowedRoles(['admin']), [], 'media', 'unlock'),
    admin: RBAC(allowedRoles(['admin']), [], 'media', 'admin'),
  },
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
