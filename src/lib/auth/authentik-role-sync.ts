import type { BasePayload } from 'payload';
import { createAuthMiddleware } from 'better-auth/api';
import { AUTHENTIK_PROVIDER_ID } from './authentik-constants';
import { type PayloadRole, sortPayloadRoles } from './payload-roles';

type AuthentikOAuthTokens = {
  accessToken?: string;
  idToken?: string;
};

/** Authentik parent group — app access only, not a Payload role. */
export const AUTHENTIK_PARENT_GROUP = 'www-users';

const AUTHENTIK_GROUP_TO_PAYLOAD_ROLE = {
  admin: 'admin',
  admins: 'admin',
  clients: 'client',
  client: 'client',
  family: 'family',
  friends: 'friend',
  friend: 'friend',
  users: 'user',
  user: 'user',
} as const satisfies Record<string, PayloadRole>;

type AuthentikGroupSlug = keyof typeof AUTHENTIK_GROUP_TO_PAYLOAD_ROLE;

const IGNORED_AUTHENTIK_GROUPS = new Set<string>([AUTHENTIK_PARENT_GROUP]);

/** Groups stashed during OAuth userinfo fetch, keyed by normalized email. */
const pendingGroupsByEmail = new Map<string, string[]>();

export function stashAuthentikGroupsForEmail(email: string, groups: string[]): void {
  pendingGroupsByEmail.set(email.trim().toLowerCase(), groups);
}

export function takePendingAuthentikGroups(email: string): string[] | undefined {
  const key = email.trim().toLowerCase();
  const groups = pendingGroupsByEmail.get(key);
  pendingGroupsByEmail.delete(key);
  return groups;
}

export function extractAuthentikGroups(profile: Record<string, unknown>): string[] {
  const raw = profile.groups ?? profile.ak_groups ?? profile.roles;
  if (raw == null) return [];

  const values = Array.isArray(raw) ? raw : [raw];
  const groups: string[] = [];

  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      groups.push(value.trim());
      continue;
    }
    if (value && typeof value === 'object') {
      const record = value as Record<string, unknown>;
      const name =
        (typeof record.name === 'string' && record.name) ||
        (typeof record.slug === 'string' && record.slug) ||
        (typeof record.group === 'string' && record.group);
      if (name) groups.push(name.trim());
    }
  }

  return groups;
}

export function mapAuthentikGroupsToPayloadRoles(groups: string[]): PayloadRole[] {
  const roles = new Set<PayloadRole>();

  for (const group of groups) {
    const normalized = group.trim().toLowerCase();
    if (!normalized || IGNORED_AUTHENTIK_GROUPS.has(normalized)) continue;

    const mapped = AUTHENTIK_GROUP_TO_PAYLOAD_ROLE[normalized as AuthentikGroupSlug];
    if (mapped) roles.add(mapped);
  }

  if (roles.size === 0) roles.add('user');

  return sortPayloadRoles([...roles]);
}

export async function syncPayloadRolesFromAuthentik(
  payload: BasePayload,
  userId: string | number,
  groups: string[],
): Promise<PayloadRole[]> {
  const role = mapAuthentikGroupsToPayloadRoles(groups);

  await payload.update({
    collection: 'users',
    id: userId,
    data: {
      role,
      emailVerified: true,
    },
    overrideAccess: true,
  });

  return role;
}

type DiscoveryDocument = {
  userinfo_endpoint?: string;
};

async function resolveAuthentikUserInfoUrl(discoveryUrl: string): Promise<string | null> {
  const response = await fetch(discoveryUrl, { method: 'GET' });
  if (!response.ok) return null;
  const discovery = (await response.json()) as DiscoveryDocument;
  return discovery.userinfo_endpoint ?? null;
}

function profileFromIdToken(idToken: string): Record<string, unknown> | null {
  const parts = idToken.split('.');
  const payloadPart = parts[1];
  if (!payloadPart) return null;

  try {
    const base64 = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(Buffer.from(base64, 'base64').toString()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Fetches Authentik userinfo (or decodes id_token) and stashes group membership for the
 * post-OAuth role sync hook. Requires an Authentik property mapping that exposes `groups`.
 */
export async function fetchAuthentikOAuthUserInfo(
  tokens: AuthentikOAuthTokens,
  discoveryUrl: string,
): Promise<{
  id: string;
  email: string;
  emailVerified: boolean;
  name: string;
  image?: string;
}> {
  let profile: Record<string, unknown> | null = null;

  if (tokens.idToken) {
    profile = profileFromIdToken(tokens.idToken);
  }

  // Always fetch userinfo when possible — Authentik group claims from scope mappings
  // often appear here but not in the id_token.
  const userInfoUrl = await resolveAuthentikUserInfoUrl(discoveryUrl);
  if (userInfoUrl && tokens.accessToken) {
    const response = await fetch(userInfoUrl, {
      method: 'GET',
      headers: { Authorization: `Bearer ${tokens.accessToken}` },
    });
    if (response.ok) {
      const userinfo = (await response.json()) as Record<string, unknown>;
      profile = { ...profile, ...userinfo };
    }
  }

  if (!profile) {
    throw new Error('Authentik userinfo is missing');
  }

  const email = typeof profile.email === 'string' ? profile.email.trim().toLowerCase() : '';
  if (!email) {
    throw new Error('Authentik userinfo is missing email');
  }

  const groups = extractAuthentikGroups(profile);
  stashAuthentikGroupsForEmail(email, groups);

  const id =
    (typeof profile.sub === 'string' && profile.sub) ||
    (typeof profile.id === 'string' && profile.id) ||
    '';
  if (!id) {
    throw new Error('Authentik userinfo is missing subject id');
  }

  const name =
    (typeof profile.name === 'string' && profile.name) ||
    (typeof profile.preferred_username === 'string' && profile.preferred_username) ||
    email;

  return {
    id,
    email,
    emailVerified: profile.email_verified === true || profile.email_verified === 'true',
    name,
    image: typeof profile.picture === 'string' ? profile.picture : undefined,
  };
}

export function createAuthentikRoleSyncAfterHook(payload: BasePayload) {
  return createAuthMiddleware(async (ctx) => {
    const path = ctx.path ?? '';
    if (!path.startsWith('/oauth2/callback/')) return;
    if (ctx.params?.providerId !== AUTHENTIK_PROVIDER_ID) return;

    const sessionUser = ctx.context.newSession?.user;
    const email = sessionUser?.email?.trim().toLowerCase();
    if (!email) return;

    const groups = takePendingAuthentikGroups(email);
    if (groups === undefined) return;

    let userId: string | number | undefined = sessionUser?.id;
    if (userId == null) {
      const result = await payload.find({
        collection: 'users',
        where: { email: { equals: email } },
        limit: 1,
        overrideAccess: true,
      });
      userId = result.docs[0]?.id;
    }

    if (userId == null) return;

    try {
      await syncPayloadRolesFromAuthentik(payload, userId, groups);
    } catch (error) {
      ctx.context.logger.error('Failed to sync Authentik groups to Payload roles', error);
    }
  });
}
