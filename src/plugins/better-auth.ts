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
const trustedOrigins = [
  baseUrl,
  ...(process.env.TRUSTED_ORIGINS?.split(',').map((o) => o.trim()) || []),
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
      createAuth: (payload) =>
        betterAuth({
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
                const collections = ['sessions', 'accounts', 'apikeys', 'twoFactors', 'passkeys'];
                for (const collection of collections) {
                  try {
                    await payload.delete({
                      collection: collection as CollectionSlug,
                      where: { user: { equals: user.id } },
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
        }),
    }),
  ];
}
