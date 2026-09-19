import { allowedRoles } from '@/access/methods/allowedRoles';
import type { PayloadRequest } from 'payload';

const EXIF_COLLECTIONS = new Set(['media', 'gallery-images']);

export async function queueExifHandler(req: PayloadRequest): Promise<Response> {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  if (!(await allowedRoles(['admin'])({ req }))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
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

  const { id, collection } = body as Record<string, unknown>;
  const numericId = typeof id === 'number' ? id : Number(id);
  if (!Number.isFinite(numericId) || numericId <= 0) {
    return Response.json({ error: 'id is required' }, { status: 400 });
  }
  if (typeof collection !== 'string' || !EXIF_COLLECTIONS.has(collection)) {
    return Response.json({ error: 'collection must be media or gallery-images' }, { status: 400 });
  }

  try {
    await req.payload.jobs.queue({
      task: 'generateImageEXIF',
      queue: 'exif',
      input: {
        id: numericId,
        collection,
      },
    });
  } catch (err) {
    console.error('[queue-exif]', err);
    return Response.json({ error: 'Failed to queue EXIF generation job' }, { status: 500 });
  }

  return Response.json({ success: true });
}
