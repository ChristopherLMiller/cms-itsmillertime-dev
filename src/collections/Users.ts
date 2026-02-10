import type { CollectionConfig } from 'payload';
import { Groups } from './groups';
import { auth } from '@/lib/auth';

export const Users: CollectionConfig = {
  slug: 'users',
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

            // No matching Payload user found — user must be pre-created by an admin.
            // To enable auto-provisioning for social login users, uncomment the block below.
            // Note: you'll need a default role ID to assign.
            //
            // const newUser = await payload.create({
            //   collection: 'users',
            //   data: {
            //     email: session.user.email,
            //     password: crypto.randomUUID(), // random password since they'll use social login
            //     displayName: session.user.name || session.user.email,
            //     roles: [YOUR_DEFAULT_ROLE_ID],
            //   },
            // });
            //
            // return {
            //   user: {
            //     collection: 'users',
            //     ...newUser,
            //   },
            // };

            return { user: null };
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
