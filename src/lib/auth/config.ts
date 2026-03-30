import type { BasePayload } from 'payload';
import { BetterAuthOptions } from 'better-auth';
import { admin, twoFactor } from 'better-auth/plugins';
import { passkey } from '@better-auth/passkey';
import { apiKeyWithDefaults } from '@delmaredigital/payload-better-auth';
import { getBaseUrl } from './getBaseUrl';
import { getTrustedOrigins } from './trustedOrigins';

/**
 * Creates Better Auth options. Pass payload when available (e.g. in createAuth)
 * to use Payload's email system and job queue for reset password emails.
 * Callbacks also use setAuthPayload() as fallback when payload is set by createAuth.
 */
export function createBetterAuthOptions(payload?: BasePayload): Partial<BetterAuthOptions> {
  return {
    trustedOrigins: getTrustedOrigins,
    user: {
      additionalFields: {
        role: {
          type: 'string',
          defaultValue: 'user',
        },
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 30, // 30 days
    },
    emailVerification: {
      sendVerificationEmail: async ({ user, url }) => {
        const urlObj = new URL(url);
        if (!urlObj.searchParams.has('callbackURL')) {
          urlObj.searchParams.set('callbackURL', '/admin');
        }
        await payload?.jobs.queue({
          task: 'sendVerificationEmail',
          input: {
            user: { email: user.email, name: user.name ?? undefined },
            url: urlObj.toString(),
          },
          queue: 'email',
        });
      },
      sendOnSignIn: true,
      sendOnSignUp: true,
      autoSignInAfterVerification: true,
      afterEmailVerification: async (user, request) => {
        let userId: string | number | undefined = user?.id;
        if (!userId && request?.url) {
          try {
            // Fallback: decode token from URL when user is null (Better Auth edge case)
            const baseUrl = getBaseUrl();
            const url = new URL(request.url, baseUrl);
            const token = url.searchParams.get('token');
            if (token) {
              const parts = token.split('.');
              const payloadPart = parts[1];
              if (payloadPart) {
                const base64 = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
                const decoded = JSON.parse(Buffer.from(base64, 'base64').toString()) as {
                  email?: string;
                };
                if (decoded.email) {
                  const result = await payload?.find({
                    collection: 'users',
                    where: { email: { equals: decoded.email } },
                    limit: 1,
                    overrideAccess: true,
                  });
                  const doc = result?.docs?.[0];
                  userId = doc != null ? doc.id : undefined;
                }
              }
            }
          } catch {
            // Ignore decode/token errors
          }
        }
        if (userId == null) return;
        await payload?.update({
          collection: 'users',
          where: { id: { equals: userId } },
          data: {
            emailVerified: true,
            role: ['user'],
          },
          overrideAccess: true,
        });
      },
    },
    emailAndPassword: {
      requireEmailVerification: true,
      enabled: true,
      revokeSessionsOnPasswordReset: true,
      autoSignIn: true,
      sendResetPassword: async ({ user, url }) => {
        await payload?.jobs.queue({
          task: 'sendResetPasswordEmail',
          input: {
            user: { email: user.email, name: user.name ?? undefined },
            url,
          },
          queue: 'email',
        });
      },
    },
    socialProviders: {
      github: {
        enabled: true,
        clientId: process.env.GITHUB_CLIENT_ID as string,
        clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
      },
      discord: {
        enabled: true,
        clientId: process.env.DISCORD_CLIENT_ID as string,
        clientSecret: process.env.DISCORD_CLIENT_SECRET as string,
      },
    },
    plugins: [admin(), twoFactor(), passkey(), apiKeyWithDefaults()],
  };
}
