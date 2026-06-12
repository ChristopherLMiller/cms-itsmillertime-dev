'use client';

import { apiKeyClient } from '@better-auth/api-key/client';
import { passkeyClient } from '@better-auth/passkey/client';
import { createAuthClient, twoFactorClient } from '@delmaredigital/payload-better-auth/client';

export const authClient = createAuthClient({
  plugins: [twoFactorClient(), passkeyClient(), apiKeyClient()],
});
export const { useSession, signIn, signUp, signOut, twoFactor, passkey } = authClient;
