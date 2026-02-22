'use client';

import { createAuthClient, payloadAuthPlugins } from '@delmaredigital/payload-better-auth/client';

export const authClient = createAuthClient({
  plugins: [...payloadAuthPlugins],
});
export const { useSession, signIn, signUp, signOut, twoFactor, passkey } = authClient;
