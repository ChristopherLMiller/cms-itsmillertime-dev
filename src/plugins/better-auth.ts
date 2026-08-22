import { createBetterAuthOptions } from '@/lib/auth/config';
import {
  crossSubDomainForBaseUrl,
  getDynamicAuthBaseURL,
  resolveAuthBaseUrl,
} from '@/lib/auth/baseURL';
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
      // Role assignment is server-side (0.8+); defaultSignUpRole on LoginView is ignored.
      firstUserAdmin: { defaultRole: 'user', adminRole: 'admin' },
    }),
    // Initialize better auth with auto-injected endspoints and admin components
    createBetterAuthPlugin({
      admin: {
        betterAuthOptions: createBetterAuthOptions(),
        enableManagementUI: true,
        // Authentik-first login; local email/password + passkey remain as break-glass.
        loginViewComponent: '@/components/auth/AuthentikLoginViewWrapper#AuthentikLoginViewWrapper',
        login: {
          title: 'Admin Login',
          requiredRole: ['admin'],
          requireAllRoles: false,
          enableSignUp: false,
          enableForgotPassword: true,
          enablePasskey: true,
          enablePassword: true,
        },
      },
      autoInjectAdminComponents: true,
      autoRegisterEndpoints: true,
      createAuth: (payload) => {
        // Resolve at auth-init time (not module load) so Coolify runtime env is used.
        const fallbackBaseUrl = resolveAuthBaseUrl();
        const crossSubDomain = crossSubDomainForBaseUrl(fallbackBaseUrl);

        return betterAuth({
          ...createBetterAuthOptions(payload),
          database: payloadAdapter({
            payloadClient: payload,
          }),
          advanced: {
            database: {
              generateId: 'serial',
            },
            // Honor X-Forwarded-Host from the www auth proxy so OAuth
            // redirect_uri matches the browser origin (avoids state_mismatch).
            trustedProxyHeaders: true,
            ...(crossSubDomain
              ? {
                  crossSubDomainCookies: {
                    enabled: true,
                    domain: crossSubDomain,
                  },
                }
              : {}),
          },
          // Static BETTER_AUTH_URL always won over X-Forwarded-Host, so Authentik
          // authorize used the CMS callback even when login started on www.
          baseURL: getDynamicAuthBaseURL(),
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
