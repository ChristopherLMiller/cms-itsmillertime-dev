import type { CollectionConfig } from 'payload';
import { Groups } from './shared/groups';
import { betterAuthStrategy } from '@delmaredigital/payload-better-auth';
import { RBAC } from '@/access/RBAC';
import { allowAll } from '@/access/methods/allowAll';
import { allowedRoles } from '@/access/methods/allowedRoles';

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
    group: Groups.authentication,
    description: 'User accounts',
    defaultColumns: ['displayName', 'email', 'roles', 'showNSFW'],
  },
  access: {
    read: RBAC(allowAll(), [], 'users', 'read'),
    create: RBAC(allowedRoles(['admin']), [], 'users', 'create'),
    update: RBAC(allowedRoles(['admin']), [], 'users', 'update'),
    delete: RBAC(allowedRoles(['admin']), [], 'users', 'delete'),
    readVersions: RBAC(allowedRoles(['admin']), [], 'users', 'readVersions'),
    unlock: RBAC(allowedRoles(['admin']), [], 'users', 'unlock'),
    admin: RBAC(allowedRoles(['admin']), [], 'users', 'admin'),
  },
  auth: {
    disableLocalStrategy: true,
    strategies: [betterAuthStrategy()],
  },
  fields: [
    { name: 'email', type: 'email', required: true, unique: true },
    { name: 'emailVerified', type: 'checkbox', defaultValue: false },
    {
      name: 'role',
      type: 'select',
      options: [
        { label: 'Family', value: 'family' },
        { label: 'Friends', value: 'friend' },
        { label: 'Client', value: 'client' },
        { label: 'User', value: 'user' },
        { label: 'Admin', value: 'admin' },
      ],
      hasMany: true,
      defaultValue: 'user',
      required: true,
      admin: {
        readOnly: true,
        description:
          'Managed by Authentik group membership on sign-in. Sign in again via Authentik to refresh.',
      },
    },
    {
      type: 'text',
      name: 'displayName',
      label: 'Display Name',
    },
    {
      type: 'join',
      name: 'albums',
      collection: 'gallery-albums',
      on: 'settings.allowedUsers',
      hasMany: true,
      admin: {
        description: 'Albums this user has access to (when visibility is By User or Role)',
      },
    },
    {
      type: 'select',
      name: 'nsfwFiltering',
      label: 'NSFW Filtering',
      defaultValue: 'hide',
      options: [
        { label: 'Hide All', value: 'hide' },
        { label: 'Blur', value: 'blur' },
        { label: 'Show', value: 'show' },
      ],
      admin: {
        description: 'Should NSFW content be hidden, blurred initially, or just shown?',
        position: 'sidebar',
      },
    },
    {
      type: 'text',
      name: 'medusaCustomerId',
      label: 'Medusa customer ID',
      admin: {
        readOnly: true,
        description: 'Linked shop customer id (set by account linking).',
        position: 'sidebar',
      },
    },
    {
      type: 'email',
      name: 'medusaCustomerEmail',
      label: 'Medusa customer email',
      admin: {
        readOnly: true,
        description: 'Shop account email at the time of linking (may differ from this user email).',
        position: 'sidebar',
      },
    },
    {
      type: 'date',
      name: 'accountLinkedAt',
      label: 'Shop account linked at',
      admin: {
        readOnly: true,
        position: 'sidebar',
      },
    },
    {
      type: 'text',
      name: 'bggUsername',
      admin: {
        position: 'sidebar',
      },
      required: false,
      label: 'BoardGameGeek Username',
    },
  ],
};
