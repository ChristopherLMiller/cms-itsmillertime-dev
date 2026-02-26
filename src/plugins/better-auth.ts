import { betterAuthOptions } from '@/lib/auth/config';
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

export function betterAuthPlugin() {
  return [
    // Auto-generate sessions,accounts, verification collections
    betterAuthCollections({
      betterAuthOptions,
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
        betterAuthOptions,
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
          ...betterAuthOptions,
          database: payloadAdapter({
            payloadClient: payload,
          }),
          advanced: {
            database: {
              generateId: 'serial',
            },
            crossSubDomainCookies: {
              enabled: true,
              domain: '*.itsmillertime.dev',
            },
          },
          baseURL: baseUrl,
          secret: process.env.BETTER_AUTH_SECRET,
          trustedOrigins: process.env.TRUSTED_ORIGINS
            ? process.env.TRUSTED_ORIGINS.split(',').map((o) => o.trim())
            : [baseUrl],
          user: {
            deleteUser: {
              enabled: true,
              afterDelete: async (user) => {
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
