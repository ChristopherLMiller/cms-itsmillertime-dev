import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

const TICKET_TTL_MS = 90_000;
const VERSION = 1;
const SESSION_COOKIE_NAME = /^(?:__Secure-)?better-auth\.session_token$/;

export type SessionTicketPayload = {
  v: number;
  exp: number;
  name: string;
  value: string;
};

function keyFromSecret(): Buffer {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) {
    throw new Error('BETTER_AUTH_SECRET is not set');
  }
  return createHash('sha256').update(secret).digest();
}

export function readSessionCookie(
  cookieHeader: string | null | undefined,
): { name: string; value: string } | null {
  if (!cookieHeader) return null;
  const match = /(?:^|;\s*)((?:__Secure-)?better-auth\.session_token)=([^;]*)/.exec(
    cookieHeader,
  );
  if (!match?.[1] || match[2] === undefined || match[2] === '') return null;
  return { name: match[1], value: match[2] };
}

export function createSessionTicket(cookie: { name: string; value: string }): string {
  if (!SESSION_COOKIE_NAME.test(cookie.name) || !cookie.value) {
    throw new Error('Invalid session cookie');
  }

  const payload: SessionTicketPayload = {
    v: VERSION,
    exp: Date.now() + TICKET_TTL_MS,
    name: cookie.name,
    value: cookie.value,
  };
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', keyFromSecret(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(payload), 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ciphertext]).toString('base64url');
}

export function openSessionTicket(ticket: string): SessionTicketPayload | null {
  try {
    const buf = Buffer.from(ticket, 'base64url');
    if (buf.length < 12 + 16 + 1) return null;
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const ciphertext = buf.subarray(28);
    const decipher = createDecipheriv('aes-256-gcm', keyFromSecret(), iv);
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    const payload = JSON.parse(plaintext.toString('utf8')) as SessionTicketPayload;
    if (payload.v !== VERSION) return null;
    if (typeof payload.exp !== 'number' || Date.now() > payload.exp) return null;
    if (!SESSION_COOKIE_NAME.test(payload.name) || !payload.value) return null;
    return payload;
  } catch {
    return null;
  }
}
