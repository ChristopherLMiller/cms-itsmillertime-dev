import type { CollectionConfig } from 'payload';
import { RBAC } from '@/access/RBAC';
import { Groups } from './groups';
import { auth } from '@/lib/auth';

export const Users: CollectionConfig = {
  slug: 'users',
  access: RBAC('users'),
  admin: {
    useAsTitle: 'email',
    group: Groups.authentication,
    description: 'User accounts',
    defaultColumns: ['displayName', 'email', 'roles', 'showNSFW'],
  },
  auth: {
    strategies: [
      {
        name: 'better-auth',
        authenticate: async ({ payload, headers }) => {
          try {
            const cookieHeader = headers.get('cookie');
            if (!cookieHeader) return { user: null };

            // Validate the Better Auth session using the session cookie
            const session = await auth.api.getSession({
              headers: new Headers({ cookie: cookieHeader }),
            });

            if (!session?.user?.email) return { user: null };

            // Find the corresponding Payload user by email
            const result = await payload.find({
              collection: 'users',
              where: {
                email: { equals: session.user.email },
              },
              limit: 1,
            });

            if (result.docs[0]) {
              return {
                user: {
                  ...result.docs[0],
                  collection: 'users',
                },
              };
            }

            // Auto-provision user on first social login
            const defaultRole = await payload.find({
              collection: 'roles',
              where: {
                isDefault: { equals: true },
              },
              limit: 1,
            });

            if (!defaultRole.docs[0]) {
              console.error('No default role found — cannot auto-provision user');
              return { user: null };
            }

            const newUser = await payload.create({
              collection: 'users',
              data: {
                email: session.user.email,
                password: crypto.randomUUID(), // random password since they'll use social login
                displayName: session.user.name || session.user.email,
                roles: [defaultRole.docs[0].id],
              },
            });

            return {
              user: {
                ...newUser,
              },
            };
          } catch (error) {
            console.error('Better Auth strategy error:', error);
            return { user: null };
          }
        },
      },
    ],
  },
  fields: [
    {
      type: 'relationship',
      relationTo: 'roles',
      name: 'roles',
      required: true,
      hasMany: true,
    },
    {
      type: 'text',
      name: 'displayName',
      label: 'Display Name',
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
      required: false,
      label: 'BoardGameGeek Username',
    },
  ],
  hooks: {
    afterChange: [
      async ({ req, doc, operation }) => {
        // Only send welcome email for new users
        if (operation === 'create') {
        }
      },
    ],
  },
};
