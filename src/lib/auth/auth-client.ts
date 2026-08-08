'use client';

import { apiKeyClient } from '@better-auth/api-key/client';
import { passkeyClient } from '@better-auth/passkey/client';
import { createAuthClient, twoFactorClient } from '@delmaredigital/payload-better-auth/client';
import { genericOAuthClient } from 'better-auth/client/plugins';

export const authClient = createAuthClient({
  plugins: [twoFactorClient(), passkeyClient(), apiKeyClient(), genericOAuthClient()],
});
export const { useSession, signIn, signUp, signOut, twoFactor, passkey } = authClient;
