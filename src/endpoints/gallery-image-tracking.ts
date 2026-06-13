import type { PayloadRequest } from 'payload';

const TRACKING_EVENTS = ['view', 'download', 'like', 'dislike', 'share'] as const;
type TrackingEvent = (typeof TRACKING_EVENTS)[number];

const EVENT_TO_FIELD = {
  view: 'views',
  download: 'downloads',
  like: 'likes',
  dislike: 'dislikes',
  share: 'shares',
} as const;

function normalizeTracking(tracking: Record<string, unknown> | null | undefined) {
  return {
    views: typeof tracking?.views === 'number' ? tracking.views : 0,
    downloads: typeof tracking?.downloads === 'number' ? tracking.downloads : 0,
    likes: typeof tracking?.likes === 'number' ? tracking.likes : 0,
    dislikes: typeof tracking?.dislikes === 'number' ? tracking.dislikes : 0,
    comments: typeof tracking?.comments === 'number' ? tracking.comments : 0,
    shares: typeof tracking?.shares === 'number' ? tracking.shares : 0,
  };
}

export async function galleryImageTrackingHandler(req: PayloadRequest): Promise<Response> {
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

  const { id, event } = body as Record<string, unknown>;
  const galleryImageId = Number(id);

  if (!Number.isFinite(galleryImageId) || galleryImageId <= 0) {
    return Response.json({ error: 'Invalid gallery image id' }, { status: 400 });
  }

  if (typeof event !== 'string' || !TRACKING_EVENTS.includes(event as TrackingEvent)) {
    return Response.json({ error: 'Invalid tracking event' }, { status: 400 });
  }

  const field = EVENT_TO_FIELD[event as TrackingEvent];

  try {
    const existing = await req.payload.findByID({
      collection: 'gallery-images',
      id: galleryImageId,
      depth: 0,
      overrideAccess: true,
    });

    if (!existing) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }

    const current = normalizeTracking(
      (existing.tracking as Record<string, unknown> | null | undefined) ?? undefined,
    );
    const nextTracking = { ...current, [field]: current[field] + 1 };

    const updated = await req.payload.update({
      collection: 'gallery-images',
      id: galleryImageId,
      data: { tracking: nextTracking },
      overrideAccess: true,
    });

    return Response.json({ tracking: normalizeTracking(updated.tracking ?? undefined) });
  } catch (err) {
    console.error('[gallery-image-tracking]', err);
    return Response.json({ error: 'Failed to update tracking' }, { status: 500 });
  }
}
