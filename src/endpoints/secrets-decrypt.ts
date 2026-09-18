import { allowedRoles } from '@/access/methods/allowedRoles';
import {
  decryptSecret,
  isEncryptedSecret,
  SettingsEncryptionError,
} from '@/lib/settings-encryption';
import type { PayloadRequest } from 'payload';

async function requireAdmin(req: PayloadRequest): Promise<boolean> {
  return allowedRoles(['admin'])({ req });
}

/**
 * POST /api/secrets/decrypt — admin-only reveal of an enc:v1:… value for the UI eye toggle.
 * Does not persist anything; plaintext is returned only to the requesting admin session.
 */
export async function secretsDecryptHandler(req: PayloadRequest): Promise<Response> {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }
  if (!(await requireAdmin(req))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = req.json ? await req.json() : null;
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const ciphertext =
    typeof (body as { ciphertext?: unknown }).ciphertext === 'string'
      ? (body as { ciphertext: string }).ciphertext.trim()
      : '';

  if (!ciphertext) {
    return Response.json({ error: 'ciphertext is required' }, { status: 400 });
  }
  if (!isEncryptedSecret(ciphertext)) {
    return Response.json({ error: 'Value is not an encrypted secret' }, { status: 400 });
  }

  try {
    const plaintext = decryptSecret(ciphertext);
    return Response.json({ plaintext });
  } catch (err) {
    const message =
      err instanceof SettingsEncryptionError
        ? err.message
        : err instanceof Error
          ? err.message
          : 'Decrypt failed';
    return Response.json({ error: message }, { status: 500 });
  }
}
