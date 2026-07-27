import { hasAnyRole } from '@delmaredigital/payload-better-auth';
import config from '@payload-config';
import { headers as nextHeaders } from 'next/headers';
import { NextResponse } from 'next/server';
import { getPayload } from 'payload';
import type { User } from '@/payload-types';

type AdminAuthSuccess = { user: User; payload: Awaited<ReturnType<typeof getPayload>> };
type AdminAuthFailure = { error: NextResponse };

/**
 * Resolve the current user via Payload auth (Better Auth session, JWT, or API key)
 * and require an admin role.
 */
export async function requireAdmin(): Promise<AdminAuthSuccess | AdminAuthFailure> {
  const payload = await getPayload({ config });
  const headersList = await nextHeaders();

  const cookieHeader = headersList.get('cookie');
  const payloadTokenMatch = cookieHeader?.match(/payload-token=([^;]+)/);
  const authHeaders = new Headers(headersList);
  if (payloadTokenMatch?.[1] && !authHeaders.has('Authorization')) {
    authHeaders.set('Authorization', `JWT ${payloadTokenMatch[1]}`);
  }

  const { user } = await payload.auth({ headers: authHeaders });

  if (!user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  // MCP API keys are treated as privileged; otherwise require admin role on users.
  const isPrivilegedKey = user.collection === 'payload-mcp-api-keys';
  if (!isPrivilegedKey && !hasAnyRole(user as User, ['admin'])) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return { user: user as User, payload };
}

export function isAdminAuthFailure(
  result: AdminAuthSuccess | AdminAuthFailure,
): result is AdminAuthFailure {
  return 'error' in result;
}
