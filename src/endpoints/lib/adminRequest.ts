import { allowedRoles } from '@/access/methods/allowedRoles';
import type { PayloadRequest } from 'payload';

export async function requireAdmin(req: PayloadRequest): Promise<boolean> {
  return allowedRoles(['admin'])({ req });
}

export function unauthorized(): Response {
  return Response.json({ error: 'Unauthorized' }, { status: 401 });
}

/** Parse a JSON object body; returns null for a missing, invalid or non-object body. */
export async function readJson(req: PayloadRequest): Promise<Record<string, unknown> | null> {
  const parseJson = req.json;
  if (!parseJson) return null;
  try {
    const body = await parseJson.call(req);
    if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
    return body as Record<string, unknown>;
  } catch {
    return null;
  }
}
