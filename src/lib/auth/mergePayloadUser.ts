/** Pull a user object out of Payload `/users/me` (shape varies by plugin version). */
export function extractPayloadMeUser(payloadMe: unknown): Record<string, unknown> | null {
  if (!payloadMe || typeof payloadMe !== 'object') return null;
  const body = payloadMe as Record<string, unknown>;

  if (body.user && typeof body.user === 'object' && body.user !== null) {
    return body.user as Record<string, unknown>;
  }

  if (body.id != null || typeof body.email === 'string') {
    return body;
  }

  return null;
}

export function mergeSessionUser(
  sessionUser: Record<string, unknown>,
  payloadUser: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  if (!payloadUser) return sessionUser;
  return { ...sessionUser, ...payloadUser };
}

/** Merge Better Auth get-session user with Payload `/api/users/me` (role lives on Payload). */
export async function fetchMergedSessionUser(
  fetchFn: typeof fetch = fetch,
): Promise<Record<string, unknown> | null> {
  const init: RequestInit = { credentials: 'include' };

  const [sessionResponse, meResponse] = await Promise.all([
    fetchFn('/api/auth/get-session', init),
    fetchFn('/api/users/me', init).catch(() => null),
  ]);

  if (!sessionResponse.ok) return null;

  const session = (await sessionResponse.json()) as { user?: Record<string, unknown> };
  if (!session.user) return null;

  let me = meResponse;
  if (!me?.ok) {
    me = await fetchFn('/api/users/me', init).catch(() => null);
  }

  if (me?.ok) {
    try {
      const payloadMe = await me.json();
      return mergeSessionUser(session.user, extractPayloadMeUser(payloadMe));
    } catch {
      // Keep base session user when Payload body is unreadable.
    }
  }

  return session.user;
}
