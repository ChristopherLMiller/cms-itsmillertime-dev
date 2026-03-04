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

/**
 * Creates Better Auth options. Pass payload when available (e.g. in createAuth)
 * to use Payload's email system for sending reset password emails.
 */
export function createBetterAuthOptions(payload?: BasePayload): Partial<BetterAuthOptions> {
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
    emailAndPassword: {
      enabled: true,
      sendResetPassword: async ({ user, url }) => {
        const html = `
          <p>Hi,</p>
          <p>You requested a password reset. Click the link below to reset your password:</p>
          <p><a href="${url}">Reset password</a></p>
          <p>This link will expire in 1 hour. If you didn't request this, you can ignore this email.</p>
        `;
        if (payload?.email?.sendEmail) {
          await payload.email.sendEmail({
            to: user.email,
            subject: 'Reset your password',
            html,
          });
        } else {
          const { error } = await resend.emails.send({
            from: 'support@itsmillertime.dev',
            to: user.email,
            subject: 'Reset your password',
            html,
          });
          if (error) throw new Error(`Failed to send reset password email: ${error.message}`);
        }
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
    advanced: {
      crossSubDomainCookies: {
        enabled: true,
        domain: 'itsmillertime.dev',
      },
    },
    trustedOrigins,
    plugins: [admin(), twoFactor(), passkey(), apiKeyWithDefaults()],
  };
}
