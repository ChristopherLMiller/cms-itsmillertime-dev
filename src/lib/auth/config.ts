import type { BasePayload } from 'payload';
import { BetterAuthOptions } from 'better-auth';
import { admin, genericOAuth, twoFactor } from 'better-auth/plugins';
import { apiKey } from '@better-auth/api-key';
import { passkey } from '@better-auth/passkey';
import { getAuthentikOAuthConfig } from './authentik';
import { AUTHENTIK_PROVIDER_ID } from './authentik-constants';
import { getBaseUrl } from './getBaseUrl';
import { getTrustedOrigins } from './trustedOrigins';

/**
 * Creates Better Auth options. Pass payload when available (e.g. in createAuth)
 * to use Payload's email system and job queue for reset password emails.
 * Callbacks also use setAuthPayload() as fallback when payload is set by createAuth.
 */
export function createBetterAuthOptions(payload?: BasePayload): Partial<BetterAuthOptions> {
  const authentik = getAuthentikOAuthConfig();

  return {
    trustedOrigins: getTrustedOrigins,
    user: {
      additionalFields: {
        // Server-assigned only — clients cannot set role at sign-up (payload-better-auth 0.8+).
        role: {
          type: 'string',
          defaultValue: 'user',
          input: false,
        },
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 30, // 30 days
    },
    account: {
      accountLinking: {
        enabled: true,
        // Authentik is our trusted IdP — link by email on first OIDC login.
        trustedProviders: [AUTHENTIK_PROVIDER_ID],
        // Existing Payload admins often have emailVerified=false (checkbox default).
        // Better Auth would then refuse to link Authentik and redirect to login
        // with ?error=account_not_linked (no session cookie) — looks like a no-op login.
        requireLocalEmailVerified: false,
      },
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
      // New accounts come from Authentik; keep password for existing/break-glass users.
      disableSignUp: true,
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
    plugins: [
      admin(),
      twoFactor(),
      passkey(),
      apiKey({ enableMetadata: true }),
      ...(authentik
        ? [
            genericOAuth({
              config: [authentik],
            }),
          ]
        : []),
    ],
  };
}
