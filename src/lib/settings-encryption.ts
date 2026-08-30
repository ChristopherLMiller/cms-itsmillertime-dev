import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

/**
 * AES-256-GCM for site-settings secrets.
 * Shared with www via the same SETTINGS_ENCRYPTION_KEY (server-only on both).
 * Format: enc:v1:<iv>.<ciphertext>.<tag>  (base64url, no padding)
 */
export const SETTINGS_ENC_PREFIX = 'enc:v1:';

export class SettingsEncryptionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SettingsEncryptionError';
  }
}

export function isEncryptedSecret(value: string): boolean {
  return value.startsWith(SETTINGS_ENC_PREFIX);
}

function keyFromEnv(): Buffer {
  const raw = process.env.SETTINGS_ENCRYPTION_KEY?.trim();
  if (!raw) {
    throw new SettingsEncryptionError(
      'SETTINGS_ENCRYPTION_KEY is not set. Add a 64-char hex key (32 bytes) on CMS and www.',
    );
  }
  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    return Buffer.from(raw, 'hex');
  }
  return createHash('sha256').update(raw, 'utf8').digest();
}

export function hasSettingsEncryptionKey(): boolean {
  return Boolean(process.env.SETTINGS_ENCRYPTION_KEY?.trim());
}

/** Encrypt plaintext. Already-prefixed values are returned unchanged (no double-encrypt). */
export function encryptSecret(plain: string): string {
  const trimmed = plain.trim();
  if (!trimmed) return trimmed;
  if (isEncryptedSecret(trimmed)) return trimmed;

  const key = keyFromEnv();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(trimmed, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${SETTINGS_ENC_PREFIX}${iv.toString('base64url')}.${encrypted.toString('base64url')}.${tag.toString('base64url')}`;
}

export function decryptSecret(value: string): string {
  const trimmed = value.trim();
  if (!trimmed || !isEncryptedSecret(trimmed)) return trimmed;

  const payload = trimmed.slice(SETTINGS_ENC_PREFIX.length);
  const parts = payload.split('.');
  if (parts.length !== 3) {
    throw new SettingsEncryptionError('Encrypted secret is malformed');
  }
  const [ivB64, dataB64, tagB64] = parts;
  const key = keyFromEnv();
  const decipher = createDecipheriv(
    'aes-256-gcm',
    key,
    Buffer.from(ivB64, 'base64url'),
  );
  decipher.setAuthTag(Buffer.from(tagB64, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}

/** Encrypt a string field on a group if it looks like plaintext. Empty stays empty. */
export function encryptGroupField(
  group: Record<string, unknown> | null | undefined,
  field: string,
): void {
  if (!group) return;
  const raw = group[field];
  if (raw == null) return;
  if (typeof raw !== 'string') return;
  const trimmed = raw.trim();
  if (!trimmed) {
    group[field] = '';
    return;
  }
  group[field] = encryptSecret(trimmed);
}
