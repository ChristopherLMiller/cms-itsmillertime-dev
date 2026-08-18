import sanitizeHtml from 'sanitize-html';
import { z } from 'zod';

const MAX_NAME = 200;
const MAX_EMAIL = 320;
const MAX_SLUG = 200;

const NO_HTML = {
  allowedTags: [] as string[],
  allowedAttributes: {},
} as const satisfies Parameters<typeof sanitizeHtml>[1];

function stripHtmlInjection(s: string): string {
  return sanitizeHtml(s, NO_HTML);
}

function stripControlsSingleLine(s: string): string {
  return s
    .replace(/\u0000/g, '')
    .replace(/[\u0001-\u001F\u007F]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export type ProductRequestFields = {
  name: string;
  email: string;
  galleryImageId: number;
  albumSlug: string | null;
};

const productRequestSchema = z.object({
  name: z.string().min(1, 'Name is required').max(MAX_NAME, 'Name is too long'),
  email: z
    .string()
    .min(1, 'Email is required')
    .max(MAX_EMAIL, 'Email is too long')
    .email('Invalid email address')
    .refine((s) => !/[\r\n<>]/.test(s), 'Invalid email address'),
  galleryImageId: z.number().int().positive('Invalid gallery image id'),
  albumSlug: z
    .string()
    .max(MAX_SLUG, 'Album slug is too long')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Invalid album slug')
    .nullable(),
});

export type ProductRequestParseResult =
  | { success: true; data: ProductRequestFields }
  | { success: false; error: string };

export function parseProductRequestBody(raw: {
  name?: unknown;
  email?: unknown;
  galleryImageId?: unknown;
  albumSlug?: unknown;
}): ProductRequestParseResult {
  const nameIn = typeof raw.name === 'string' ? raw.name : '';
  const emailIn = typeof raw.email === 'string' ? raw.email : '';
  const slugIn = typeof raw.albumSlug === 'string' ? raw.albumSlug : '';

  const name = stripControlsSingleLine(stripHtmlInjection(nameIn)).slice(0, MAX_NAME);
  const email = stripHtmlInjection(emailIn.trim()).toLowerCase().slice(0, MAX_EMAIL);
  const albumSlugRaw = stripControlsSingleLine(stripHtmlInjection(slugIn))
    .toLowerCase()
    .slice(0, MAX_SLUG);

  const galleryImageId = Number(raw.galleryImageId);

  const parsed = productRequestSchema.safeParse({
    name,
    email,
    galleryImageId,
    albumSlug: albumSlugRaw.length > 0 ? albumSlugRaw : null,
  });

  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { success: false, error: first?.message ?? 'Invalid input' };
  }

  return { success: true, data: parsed.data };
}

export function safeProductRequestAdminSubject(imageTitle: string, requesterName: string): string {
  const title = imageTitle.replace(/[\r\n\u0000]/g, ' ').trim() || 'gallery image';
  const name = requesterName.replace(/[\r\n\u0000]/g, ' ').trim() || 'someone';
  return `Shop request: ${title} from ${name}`.slice(0, 998);
}

export function safeProductRequestAvailableSubject(imageTitle: string): string {
  const title = imageTitle.replace(/[\r\n\u0000]/g, ' ').trim() || 'A gallery image';
  return `${title} is now available to purchase`.slice(0, 998);
}
