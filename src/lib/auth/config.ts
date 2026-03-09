import type { BasePayload } from 'payload';
import { BetterAuthOptions } from 'better-auth';
import { admin, twoFactor } from 'better-auth/plugins';
import { passkey } from '@better-auth/passkey';
import { apiKeyWithDefaults } from '@delmaredigital/payload-better-auth';
import { Resend } from 'resend';
import { getBaseUrl } from './getBaseUrl';

const resend = new Resend(process.env.RESEND_API_KEY);
const baseUrl = getBaseUrl();
const trustedOrigins = [
  baseUrl,
  ...(process.env.TRUSTED_ORIGINS?.split(',').map((o) => o.trim()) || []),
];

/** Module-level payload reference, set when createAuth runs. Use as fallback when payload isn't passed. */
let payloadRef: BasePayload | undefined;

/** Set the payload instance (called from createAuth). Enables callbacks to access payload even when not passed. */
export function setAuthPayload(payload: BasePayload): void {
  payloadRef = payload;
}

/** Get the current payload instance. Prefers the passed argument, falls back to the module ref. */
function getPayload(payload?: BasePayload): BasePayload | undefined {
  return payload ?? payloadRef;
}

/**
 * Creates Better Auth options. Pass payload when available (e.g. in createAuth)
 * to use Payload's email system and job queue for reset password emails.
 * Callbacks also use setAuthPayload() as fallback when payload is set by createAuth.
 */
export function createBetterAuthOptions(payload?: BasePayload): Partial<BetterAuthOptions> {
  const p = getPayload(payload);
  return {
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
      sendOnSignIn: true,
      sendOnSignUp: true,
      autoSignInAfterVerification: true,
      afterEmailVerification: async (user) => {
        const result = await getPayload()?.update({
          collection: 'users',
          where: { id: { equals: user.id } },
          data: {
            emailVerified: true,
            role: ['user'],
          },
        });
        console.log('Email verification result:', result);
      },
    },
    emailAndPassword: {
      requireEmailVerification: true,
      enabled: true,
      revokeSessionsOnPasswordReset: true,
      autoSignIn: true,
      ...(p && {
        sendResetPassword: async ({ user, url }) => {
          const html = `
          <p>Hi,</p>
          <p>You requested a password reset. Click the link below to reset your password:</p>
          <p><a href="${url}">Reset password</a></p>
          <p>This link will expire in 1 hour. If you didn't request this, you can ignore this email.</p>
        `;
          const result = await getPayload()?.jobs.queue({
            task: 'sendResetPasswordEmail',
            input: {
              to: user.email,
              subject: 'Reset your password',
              html,
            },
            queue: 'default',
          });
          console.log('Reset password email result:', result);
        },
      }),
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
