/**
 * Client-safe helpers for encrypted settings secrets.
 * Keep free of node:crypto so admin field components can import this.
 * Format: enc:v1:<iv>.<ciphertext>.<tag>  (base64url, no padding)
 */
export const SETTINGS_ENC_PREFIX = 'enc:v1:';

export function isEncryptedSecret(value: string): boolean {
  return typeof value === 'string' && value.startsWith(SETTINGS_ENC_PREFIX);
}
