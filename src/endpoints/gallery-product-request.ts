import type { PayloadRequest } from 'payload';
import {
  galleryImageCmsUrl,
  galleryImageEmailSrc,
  galleryImagePublicUrl,
} from '../utilities/productRequestUrls';
import { parseProductRequestBody } from '../utilities/sanitizeProductRequest';

type GalleryImageDoc = {
  id: number;
  alt?: string | null;
  url?: string | null;
  filename?: string | null;
  prefix?: string | null;
};

export async function galleryProductRequestHandler(req: PayloadRequest): Promise<Response> {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const parseJson = req.json;
  if (!parseJson) {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await parseJson.call(req);
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = parseProductRequestBody(body as Record<string, unknown>);
  if (!parsed.success) {
    return Response.json({ error: parsed.error }, { status: 400 });
  }

  const { name, email, galleryImageId, albumSlug } = parsed.data;

  if (!process.env.CONTACT_EMAIL) {
    return Response.json(
      { error: 'Product request recipient is not configured' },
      { status: 500 },
    );
  }

  try {
    const image = (await req.payload.findByID({
      collection: 'gallery-images',
      id: galleryImageId,
      depth: 0,
      // Storefront already decided the visitor can see this image.
      overrideAccess: true,
      disableErrors: true,
    })) as GalleryImageDoc | null;

    if (!image) {
      return Response.json({ error: 'Gallery image not found' }, { status: 404 });
    }

    const existing = await req.payload.find({
      collection: 'gallery-product-requests',
      where: {
        and: [
          { galleryImage: { equals: galleryImageId } },
          { email: { equals: email } },
          { status: { equals: 'pending' } },
        ],
      },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    });

    if (existing.docs.length > 0) {
      return Response.json({ success: true, duplicate: true });
    }

    const imageTitle = (image.alt ?? '').trim() || `Image #${galleryImageId}`;
    const imageUrl = galleryImageEmailSrc(image);
    const galleryUrl = galleryImagePublicUrl(albumSlug, galleryImageId);
    const cmsUrl = galleryImageCmsUrl(galleryImageId);

    const userId =
      req.user && req.user.collection === 'users' && typeof req.user.id === 'number'
        ? req.user.id
        : undefined;

    await req.payload.create({
      collection: 'gallery-product-requests',
      overrideAccess: true,
      data: {
        galleryImage: galleryImageId,
        name,
        email,
        status: 'pending',
        albumSlug: albumSlug ?? undefined,
        imageTitle,
        imageUrl: imageUrl ?? undefined,
        user: userId,
      },
    });

    await req.payload.jobs.queue({
      task: 'sendProductRequestAdminEmail',
      input: {
        requesterName: name,
        requesterEmail: email,
        imageTitle,
        imageId: galleryImageId,
        imageUrl: imageUrl ?? '',
        galleryUrl: galleryUrl ?? '',
        cmsUrl,
      },
      queue: 'email',
    });

    return Response.json({ success: true });
  } catch (err) {
    console.error('[gallery-product-request]', err);
    return Response.json({ error: 'Failed to save request' }, { status: 500 });
  }
}
