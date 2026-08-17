import { RBAC } from '@/access/RBAC';
import { allowedRoles } from '@/access/methods/allowedRoles';
import { Groups } from '@/collections/shared/groups';
import { defaultAltText } from '@/collections/shared/defaultAltText';
import { ensureUploadPrefix } from '@/collections/shared/ensureUploadPrefix';
import { type CollectionConfig } from 'payload';

/**
 * Private full-resolution originals for gallery images (no watermark, no
 * Payload imageSizes). Admin-only — never use `media` for this, that
 * collection is publicly readable.
 *
 * Stored in the same R2 bucket under document prefix `gallery-masters/`.
 * Do not add a public CDN host for this slug; file routes require admin.
 */
export const GalleryMasters: CollectionConfig<'gallery-masters'> = {
  slug: 'gallery-masters',
  labels: {
    singular: 'Master',
    plural: 'Masters',
  },
  admin: {
    group: Groups.galleries,
    description: 'Private full-resolution originals. Not publicly readable.',
    useAsTitle: 'filename',
    defaultColumns: ['filename', 'alt', 'updatedAt'],
  },
  folders: false,
  access: {
    read: RBAC(allowedRoles(['admin']), [], 'gallery-masters', 'read'),
    create: RBAC(allowedRoles(['admin']), [], 'gallery-masters', 'create'),
    update: RBAC(allowedRoles(['admin']), [], 'gallery-masters', 'update'),
    delete: RBAC(allowedRoles(['admin']), [], 'gallery-masters', 'delete'),
    readVersions: RBAC(allowedRoles(['admin']), [], 'gallery-masters', 'readVersions'),
    unlock: RBAC(allowedRoles(['admin']), [], 'gallery-masters', 'unlock'),
    admin: RBAC(allowedRoles(['admin']), [], 'gallery-masters', 'admin'),
  },
  upload: {
    disableLocalStorage: true,
    cacheTags: true,
    focalPoint: false,
    displayPreview: true,
    withMetadata: true,
    pasteURL: false,
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/tiff'],
  },
  fields: [
    {
      name: 'prefix',
      type: 'text',
      defaultValue: 'gallery-masters',
      admin: {
        hidden: true,
        readOnly: true,
      },
    },
    {
      name: 'alt',
      type: 'text',
      required: true,
    },
    {
      name: 'sourceStem',
      type: 'text',
      admin: {
        description: 'Local filename stem from ingest (piu).',
      },
    },
  ],
  hooks: {
    beforeChange: [ensureUploadPrefix('gallery-masters')],
    beforeValidate: [defaultAltText],
  },
};
