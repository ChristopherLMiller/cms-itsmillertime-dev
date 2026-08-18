import { RBAC } from '@/access/RBAC';
import { allowedRoles } from '@/access/methods/allowedRoles';
import { Groups } from '@/collections/shared/groups';
import type { CollectionConfig } from 'payload';

/**
 * Waitlist of people who asked to be emailed when a gallery image is listed
 * in the shop. Public creates go through POST /api/gallery-product-request,
 * not the REST collection (create here is admin-only).
 */
export const GalleryProductRequests: CollectionConfig<'gallery-product-requests'> = {
  slug: 'gallery-product-requests',
  labels: {
    singular: 'Product request',
    plural: 'Product requests',
  },
  admin: {
    group: Groups.galleries,
    description: 'People waiting to buy a gallery image that is not listed yet.',
    useAsTitle: 'name',
    defaultColumns: ['galleryImage', 'name', 'email', 'status', 'createdAt'],
  },
  access: {
    read: RBAC(allowedRoles(['admin']), [], 'gallery-product-requests', 'read'),
    create: RBAC(allowedRoles(['admin']), [], 'gallery-product-requests', 'create'),
    update: RBAC(allowedRoles(['admin']), [], 'gallery-product-requests', 'update'),
    delete: RBAC(allowedRoles(['admin']), [], 'gallery-product-requests', 'delete'),
    readVersions: RBAC(allowedRoles(['admin']), [], 'gallery-product-requests', 'readVersions'),
    unlock: RBAC(allowedRoles(['admin']), [], 'gallery-product-requests', 'unlock'),
    admin: RBAC(allowedRoles(['admin']), [], 'gallery-product-requests', 'admin'),
  },
  fields: [
    {
      name: 'galleryImage',
      type: 'relationship',
      relationTo: 'gallery-images',
      required: true,
      index: true,
      admin: {
        description: 'The gallery image they want listed in the shop.',
      },
    },
    {
      name: 'name',
      type: 'text',
      required: true,
      maxLength: 200,
    },
    {
      name: 'email',
      type: 'email',
      required: true,
      index: true,
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      index: true,
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Notified', value: 'notified' },
        { label: 'Cancelled', value: 'cancelled' },
      ],
    },
    {
      name: 'albumSlug',
      type: 'text',
      maxLength: 200,
      admin: {
        description: 'Album slug at request time, used to deep-link the lightbox.',
      },
    },
    {
      name: 'imageTitle',
      type: 'text',
      maxLength: 300,
      admin: {
        description: 'Snapshot of the image alt/title for emails.',
        readOnly: true,
      },
    },
    {
      name: 'imageUrl',
      type: 'text',
      admin: {
        description: 'Public thumbnail URL snapshot for emails.',
        readOnly: true,
      },
    },
    {
      name: 'notifiedAt',
      type: 'date',
      admin: {
        date: { pickerAppearance: 'dayAndTime' },
        readOnly: true,
        condition: (data) => data?.status === 'notified',
      },
    },
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      admin: {
        description: 'Set when the requester was logged in.',
      },
    },
  ],
};
