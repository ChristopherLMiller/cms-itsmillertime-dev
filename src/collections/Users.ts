import type { CollectionConfig } from 'payload';
import { Groups } from './groups';
import { betterAuthStrategy } from '@delmaredigital/payload-better-auth';
import { RBAC } from '@/access';

export const Users: CollectionConfig = {
  slug: 'users',
  access: RBAC('users'),
  admin: {
    useAsTitle: 'email',
    group: Groups.authentication,
    description: 'User accounts',
    defaultColumns: ['displayName', 'email', 'roles', 'showNSFW'],
  },
  access: {
    read: RBAC().allowAll().result(),
    create: RBAC().allowedRoles(['admin']).result(),
    update: RBAC().allowedRoles(['admin']).result(),
    delete: RBAC().allowedRoles(['admin']).result(),
    readVersions: RBAC().allowedRoles(['admin']).result(),
    unlock: RBAC().allowedRoles(['admin']).result(),
    admin: RBAC().allowedRoles(['admin']).result(),
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
    },
    {
      type: 'text',
      name: 'displayName',
      label: 'Display Name',
    },
    {
      type: 'join',
      name: 'apiKeys',
      collection: 'apikeys',
      on: 'user',
    },
    {
      type: 'checkbox',
      name: 'showNSFW',
      label: 'Show NSFW',
      defaultValue: false,
      admin: {
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
