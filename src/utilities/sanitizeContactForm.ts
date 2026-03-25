import sanitizeHtml from 'sanitize-html';
import { z } from 'zod';

const MAX_NAME = 200;
const MAX_EMAIL = 320;
const MAX_MESSAGE = 20_000;

/** Strip all tags / attribute-based vectors; keep text (including newlines in plain-text input). */
const NO_HTML = {
  allowedTags: [] as string[],
  allowedAttributes: {},
} as const satisfies Parameters<typeof sanitizeHtml>[1];

function stripHtmlInjection(s: string): string {
  return sanitizeHtml(s, NO_HTML);
}

function stripControlsForMessage(s: string): string {
  return s
    .replace(/\u0000/g, '')
    .replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');
}

function stripControlsSingleLine(s: string): string {
  return s
    .replace(/\u0000/g, '')
    .replace(/[\u0001-\u001F\u007F]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export type ContactFormFields = {
  senderName: string;
  senderEmail: string;
  message: string;
};

const contactFormSchema = z.object({
  senderName: z
    .string()
    .min(1, 'Name is required')
    .max(MAX_NAME, 'Name is too long'),
  senderEmail: z
    .string()
    .min(1, 'Email is required')
    .max(MAX_EMAIL, 'Email is too long')
    .email('Invalid email address')
    .refine((s) => !/[\r\n<>]/.test(s), 'Invalid email address'),
  message: z
    .string()
    .min(1, 'Message is required')
    .max(MAX_MESSAGE, 'Message is too long'),
});

export type ContactFormParseResult =
  | { success: true; data: ContactFormFields }
  | { success: false; error: string };

/**
 * Sanitize with sanitize-html, then normalize control characters, then validate with Zod.
 */
export function parseContactFormBody(raw: {
  name?: unknown;
  email?: unknown;
  message?: unknown;
}): ContactFormParseResult {
  const nameIn = typeof raw.name === 'string' ? raw.name : '';
  const emailIn = typeof raw.email === 'string' ? raw.email : '';
  const messageIn = typeof raw.message === 'string' ? raw.message : '';

  const senderName = stripControlsSingleLine(stripHtmlInjection(nameIn)).slice(0, MAX_NAME);
  const senderEmail = stripHtmlInjection(emailIn.trim()).slice(0, MAX_EMAIL);
  let message = stripControlsForMessage(stripHtmlInjection(messageIn));
  message = message.trim().slice(0, MAX_MESSAGE);

  const parsed = contactFormSchema.safeParse({
    senderName,
    senderEmail,
    message,
  });

  if (!parsed.success) {
    const first = parsed.error.issues[0];
    const msg = first?.message ?? 'Invalid input';
    return { success: false, error: msg };
  }

  return { success: true, data: parsed.data };
}

export function safeEmailSubjectLine(senderName: string): string {
  const line = `Contact form: ${senderName}`.replace(/[\r\n\u0000]/g, ' ').trim();
  return line.slice(0, 998);
}
