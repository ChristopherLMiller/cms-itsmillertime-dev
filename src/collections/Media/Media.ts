import { type CollectionConfig } from 'payload';
import { Groups } from '../shared/groups';
import { cdnShareUrlField, imageContentFields, imageTechnicalFields } from '../shared/imageFields';
import { baseUploadConfig } from '../shared/uploadConfig';
import { defaultAltText } from '../shared/defaultAltText';
import { ensureUploadPrefix } from '../shared/ensureUploadPrefix';
import { sanitizeIncomingExif } from '../shared/sanitizeIncomingExif';
import { generateBlurHash } from '../shared/generateBlurHash';
import { generateEXIF } from '../shared/generateEXIF';
import { RBAC } from '@/access/RBAC';
import { allowAll } from '@/access/methods/allowAll';
import { allowedRoles } from '@/access/methods/allowedRoles';

/**
 * R2 / S3 key namespacing (shared bucket with gallery-images):
 *
 * Media and gallery-images share one Cloudflare R2 bucket. Filenames alone are not
 * unique across collections, so same-name uploads used to overwrite each other.
 *
 * We use a document-level `prefix` (default `media`) so NEW uploads land under
 * `media/…`. Existing docs keep NULL/empty prefix and still resolve at the bucket
 * root — do NOT set collection-level `prefix` in `s3Storage` yet, or those root
 * keys break (Payload falls back to collection prefix when doc prefix is empty).
 *
 * Overwritten root objects cannot be recovered; re-upload those assets.
 *
 * Future: once every live Media asset lives under `media/` (re-upload through the
 * CMS, or move objects + `UPDATE media SET prefix = 'media' WHERE prefix IS NULL`),
 * set `prefix: 'media'` on the media entry in `src/plugins/index.ts` s3Storage config.
 */
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
    // Document R2 prefix — see collection comment above. Leave NULL on legacy root docs.
    {
      name: 'prefix',
      type: 'text',
      defaultValue: 'media',
      admin: {
        hidden: true,
        readOnly: true,
      },
    },
    cdnShareUrlField,
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
    beforeChange: [ensureUploadPrefix('media'), sanitizeIncomingExif],
    beforeValidate: [defaultAltText, generateBlurHash],
  },
};
