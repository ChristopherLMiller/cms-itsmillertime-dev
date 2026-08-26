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
  defaultSort: '-createdAt',
  admin: {
    group: Groups.galleries,
    description:
      'People waiting to buy a gallery image. Listing the image on the Store tab emails them.',
    useAsTitle: 'imageTitle',
    defaultColumns: ['imageUrl', 'imageTitle', 'name', 'email', 'status', 'galleryImage', 'createdAt'],
    listSearchableFields: ['name', 'email', 'imageTitle'],
    components: {
      beforeListTable: ['@/components/Commerce/ProductRequestsListIntro#ProductRequestsListIntro'],
    },
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
      name: 'summary',
      type: 'ui',
      admin: {
        components: {
          Field: '@/components/Commerce/ProductRequestSummary#ProductRequestSummary',
        },
      },
    },
    {
      type: 'row',
      fields: [
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
      ],
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      index: true,
      options: [
        { label: 'Pending — waiting for listing', value: 'pending' },
        { label: 'Notified — email sent', value: 'notified' },
        { label: 'Cancelled — will not list', value: 'cancelled' },
      ],
      admin: {
        description:
          'Flips to Notified automatically after the waitlist email is sent. Use Cancelled only if you will not list this photo.',
        components: {
          Cell: '@/components/Commerce/ProductRequestCells#ProductRequestStatusCell',
        },
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
      name: 'galleryImage',
      type: 'relationship',
      relationTo: 'gallery-images',
      required: true,
      index: true,
      admin: {
        description: 'The gallery image they want listed.',
        components: {
          Cell: '@/components/Commerce/ProductRequestCells#ProductRequestImageLinkCell',
        },
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
      label: 'Image',
      admin: {
        description: 'Public thumbnail used in emails.',
        readOnly: true,
        components: {
          Field: '@/components/Commerce/ProductRequestCells#HiddenOnEdit',
          Cell: '@/components/Commerce/ProductRequestCells#ProductRequestImageCell',
        },
      },
    },
    {
      name: 'albumSlug',
      type: 'text',
      maxLength: 200,
      admin: {
        description: 'Album slug at request time, used to deep-link the lightbox.',
        readOnly: true,
      },
    },
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      admin: {
        description: 'Set when the requester was logged in.',
        readOnly: true,
      },
    },
  ],
};
