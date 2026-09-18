import { allowedRoles } from '@/access/methods/allowedRoles';
import {
  buildAnnounceContent,
  docPublicUrl,
  docTitle,
  isAnnounceEligible,
} from '@/utilities/publishAnnounce';
import { frontendBaseUrl } from '@/utilities/productRequestUrls';
import {
  isAnnounceCollection,
  platformLabel,
  type AnnounceCollection,
} from '@/utilities/socialPlatforms';
import type { SocialDestinationRow } from '@/utilities/socialAdapters';
import { isImplementedPlatform, sendToDestination } from '@/utilities/socialAdapters';
import type { PayloadRequest } from 'payload';

async function requireAdmin(req: PayloadRequest): Promise<boolean> {
  return allowedRoles(['admin'])({ req });
}

async function readJson(req: PayloadRequest): Promise<Record<string, unknown> | null> {
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

function parseDocId(value: unknown): number | null {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

type AnnounceDoc = {
  id: number;
  title?: string | null;
  slug?: string | null;
  announce?: {
    notifiedAt?: string | null;
    skippedAt?: string | null;
  } | null;
  _status?: string | null;
  model_meta?: { status?: string | null } | null;
  settings?: {
    slug?: string | null;
    visibility?: string | null;
  } | null;
};

async function loadDoc(
  req: PayloadRequest,
  collection: AnnounceCollection,
  id: number,
): Promise<AnnounceDoc | null> {
  try {
    if (collection === 'posts') {
      // Prefer published version for eligibility; fall back to draft working copy.
      try {
        const published = await req.payload.findByID({
          collection,
          id,
          depth: 0,
          overrideAccess: true,
          draft: false,
        });
        if (published) return published as AnnounceDoc;
      } catch {
        // not published yet
      }
    }

    const doc = await req.payload.findByID({
      collection,
      id,
      depth: 0,
      overrideAccess: true,
      draft: collection === 'posts' ? true : undefined,
    });
    return doc as AnnounceDoc;
  } catch {
    return null;
  }
}

async function markAnnounce(
  req: PayloadRequest,
  collection: AnnounceCollection,
  id: number,
  patch: { notifiedAt?: string; skippedAt?: string },
): Promise<void> {
  const data = { announce: patch };
  const context = {
    skipRelationSync: true,
    skipPublishAnnounce: true,
  };

  if (collection === 'posts') {
    // Keep draft + published in sync so the edit view reflects the settle state.
    await req.payload.update({
      collection,
      id,
      data,
      overrideAccess: true,
      context,
      draft: true,
    });
    await req.payload.update({
      collection,
      id,
      data,
      overrideAccess: true,
      context,
      draft: false,
    });
    return;
  }

  await req.payload.update({
    collection,
    id,
    data,
    overrideAccess: true,
    context,
  });
}

/** GET /api/publish-announce/destinations — enabled destinations without secrets. */
export async function publishAnnounceDestinationsHandler(
  req: PayloadRequest,
): Promise<Response> {
  if (req.method !== 'GET') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }
  if (!(await requireAdmin(req))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const globalDoc = await req.payload.findGlobal({
    slug: 'social-destinations',
    overrideAccess: true,
    depth: 0,
  });

  const destinations = (Array.isArray(globalDoc?.destinations)
    ? (globalDoc.destinations as SocialDestinationRow[])
    : []
  )
    .filter((row) => row && row.enabled !== false && typeof row.id === 'string' && row.id)
    .map((row) => ({
      id: row.id as string,
      label: row.label || platformLabel(String(row.type || '')),
      type: row.type || 'custom_webhook',
      typeLabel: platformLabel(String(row.type || '')),
      defaultSelected: Boolean(row.defaultSelected),
      implemented: isImplementedPlatform(String(row.type || '')),
    }));

  return Response.json({ destinations });
}

/** POST /api/publish-announce — send message to selected destinations. */
export async function publishAnnounceSendHandler(req: PayloadRequest): Promise<Response> {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }
  if (!(await requireAdmin(req))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await readJson(req);
  if (!body) {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const collection = body.collection;
  const id = parseDocId(body.id);
  const message = typeof body.message === 'string' ? body.message.trim() : '';
  const destinationIds = Array.isArray(body.destinationIds)
    ? body.destinationIds.filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
    : [];

  if (!isAnnounceCollection(collection) || !id) {
    return Response.json(
      { error: 'collection and id are required (posts | models | gallery-albums)' },
      { status: 400 },
    );
  }
  if (!message) {
    return Response.json({ error: 'message is required' }, { status: 400 });
  }
  if (destinationIds.length === 0) {
    return Response.json({ error: 'Select at least one destination' }, { status: 400 });
  }

  const doc = await loadDoc(req, collection, id);
  if (!doc) {
    return Response.json({ error: 'Document not found' }, { status: 404 });
  }
  if (!isAnnounceEligible(collection, doc)) {
    return Response.json(
      {
        error:
          'Document is not eligible to announce (already announced/skipped, or not in a first-publish state).',
      },
      { status: 409 },
    );
  }

  const url = docPublicUrl(collection, doc);
  if (!url) {
    return Response.json(
      { error: 'Document needs a slug before it can be announced' },
      { status: 400 },
    );
  }

  const globalDoc = await req.payload.findGlobal({
    slug: 'social-destinations',
    overrideAccess: true,
    depth: 0,
  });
  const allDestinations = Array.isArray(globalDoc?.destinations)
    ? (globalDoc.destinations as SocialDestinationRow[])
    : [];
  const selected = destinationIds
    .map((destId) => allDestinations.find((row) => row?.id === destId))
    .filter(
      (row): row is SocialDestinationRow & { id: string; type: string } =>
        Boolean(
          row &&
            row.enabled !== false &&
            typeof row.id === 'string' &&
            row.id.length > 0 &&
            typeof row.type === 'string' &&
            row.type.length > 0,
        ),
    );

  if (selected.length === 0) {
    return Response.json({ error: 'No matching enabled destinations found' }, { status: 400 });
  }

  const title = docTitle(doc);
  const queued: string[] = [];

  for (const dest of selected) {
    await req.payload.jobs.queue({
      task: 'sendPublishAnnounce',
      input: {
        destinationId: dest.id,
        destinationLabel: dest.label ?? null,
        destinationType: dest.type,
        message,
        url,
        title,
        collection,
        documentId: id,
      },
      queue: 'default',
    });
    queued.push(dest.label || dest.id);
  }

  const notifiedAt = new Date().toISOString();
  await markAnnounce(req, collection, id, { notifiedAt });

  return Response.json({
    success: true,
    notifiedAt,
    url,
    queued,
  });
}

/** POST /api/publish-announce/test — send a live test message to one saved destination. */
export async function publishAnnounceTestHandler(req: PayloadRequest): Promise<Response> {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }
  if (!(await requireAdmin(req))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await readJson(req);
  if (!body) {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const destinationId =
    typeof body.destinationId === 'string' ? body.destinationId.trim() : '';
  if (!destinationId) {
    return Response.json(
      { error: 'destinationId is required (save the destination row first)' },
      { status: 400 },
    );
  }

  const globalDoc = await req.payload.findGlobal({
    slug: 'social-destinations',
    overrideAccess: true,
    depth: 0,
  });
  const destinations = Array.isArray(globalDoc?.destinations)
    ? (globalDoc.destinations as SocialDestinationRow[])
    : [];
  const destination = destinations.find((row) => row?.id === destinationId);
  if (!destination) {
    return Response.json(
      {
        error:
          'Destination not found. Save Social Destinations first so this row has an id, then test.',
      },
      { status: 404 },
    );
  }

  const type = typeof destination.type === 'string' ? destination.type.trim() : '';
  if (!type) {
    return Response.json({ error: 'Destination has no platform type' }, { status: 400 });
  }
  if (!isImplementedPlatform(type)) {
    return Response.json(
      { error: `Platform type “${type}” is not implemented` },
      { status: 400 },
    );
  }

  const url = frontendBaseUrl();
  const title = 'Connection test';
  const message =
    typeof body.message === 'string' && body.message.trim()
      ? body.message.trim()
      : `Connection test from ItsMillerTime CMS (${destination.label || platformLabel(type)}). You can ignore or delete this.`;
  const content = buildAnnounceContent(message, url);

  const result = await sendToDestination({
    destination,
    content,
    url,
    title,
    collection: 'test',
  });

  if (!result.ok) {
    return Response.json(
      {
        success: false,
        error: result.error || 'Test failed',
        destinationId,
        destinationLabel: destination.label || platformLabel(type),
        destinationType: type,
        status: result.status ?? null,
        skipped: Boolean(result.skipped),
      },
      { status: 502 },
    );
  }

  return Response.json({
    success: true,
    destinationId,
    destinationLabel: destination.label || platformLabel(type),
    destinationType: type,
    status: result.status ?? null,
  });
}

/** POST /api/publish-announce/skip — mark announce skipped (no re-prompt). */
export async function publishAnnounceSkipHandler(req: PayloadRequest): Promise<Response> {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }
  if (!(await requireAdmin(req))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await readJson(req);
  if (!body) {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const collection = body.collection;
  const id = parseDocId(body.id);
  if (!isAnnounceCollection(collection) || !id) {
    return Response.json(
      { error: 'collection and id are required (posts | models | gallery-albums)' },
      { status: 400 },
    );
  }

  const doc = await loadDoc(req, collection, id);
  if (!doc) {
    return Response.json({ error: 'Document not found' }, { status: 404 });
  }
  if (doc.announce?.notifiedAt || doc.announce?.skippedAt) {
    return Response.json({ success: true, alreadySettled: true });
  }

  const skippedAt = new Date().toISOString();
  await markAnnounce(req, collection, id, { skippedAt });
  return Response.json({ success: true, skippedAt });
}
