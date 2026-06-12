import { createBetterAuthOptions } from '@/lib/auth/config';
import { getBaseUrl } from '@/lib/auth/getBaseUrl';
import { betterAuth } from 'better-auth';
import {
  betterAuthCollections,
  createBetterAuthPlugin,
  hasRole,
  isAdmin,
  isAdminOrSelf,
  isAuthenticated,
  payloadAdapter,
} from '@delmaredigital/payload-better-auth';
import { CollectionSlug } from 'payload';

const baseUrl = getBaseUrl();

const userLinkedCollections: { collection: CollectionSlug; field: string }[] = [
  { collection: 'sessions', field: 'user' },
  { collection: 'accounts', field: 'user' },
  { collection: 'apikeys', field: 'referenceId' },
  { collection: 'twoFactors', field: 'user' },
  { collection: 'passkeys', field: 'user' },
];

export function betterAuthPlugin() {
  return [
    // Auto-generate sessions,accounts, verification collections
    betterAuthCollections({
      betterAuthOptions: createBetterAuthOptions(),
      access: {
        read: isAuthenticated(),
        create: hasRole(['admin']),
        update: isAdminOrSelf(),
        delete: isAdmin(),
      },
      skipCollections: ['user'],
    }),
    // Initialize better auth with auto-injected endspoints and admin components
    createBetterAuthPlugin({
      admin: {
        betterAuthOptions: createBetterAuthOptions(),
        enableManagementUI: true,
        login: {
          title: 'Admin Login',
          requiredRole: ['admin'],
          requireAllRoles: false,
          enableSignUp: 'auto',
          defaultSignUpRole: 'user',
          enableForgotPassword: 'auto',
          enablePasskey: 'auto',
        },
      },
      autoInjectAdminComponents: true,
      autoRegisterEndpoints: true,
      createAuth: (payload) => {
        return betterAuth({
          ...createBetterAuthOptions(payload),
          database: payloadAdapter({
            payloadClient: payload,
          }),
          advanced: {
            database: {
              generateId: 'serial',
            },
          },
          baseURL: baseUrl,
          secret: process.env.BETTER_AUTH_SECRET,
          user: {
            deleteUser: {
              enabled: true,
              afterDelete: async (user: { id: any }) => {
                for (const { collection, field } of userLinkedCollections) {
                  try {
                    await payload.delete({
                      collection,
                      where: { [field]: { equals: user.id } },
                    });
                  } catch (error) {
                    console.error(
                      `Error deleting user data for user ${user.id} in collection ${collection}: ${error}`,
                    );
                  }
                }
              },
            },
          },
        });
      },
    }),
  ];
}
