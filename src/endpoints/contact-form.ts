import type { PayloadRequest } from 'payload';
import { parseContactFormBody } from '../utilities/sanitizeContactForm';

export async function contactFormHandler(req: PayloadRequest): Promise<Response> {
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

  const { name, email, message } = body as Record<string, unknown>;

  const parsed = parseContactFormBody({ name, email, message });
  if (!parsed.success) {
    return Response.json({ error: parsed.error }, { status: 400 });
  }

  const { senderName, senderEmail, message: messageText } = parsed.data;

  if (!process.env.CONTACT_EMAIL) {
    return Response.json(
      { error: 'Contact form recipient is not configured' },
      { status: 500 },
    );
  }

  try {
    await req.payload.jobs.queue({
      task: 'sendContactFormEmail',
      input: {
        senderName,
        senderEmail,
        message: messageText,
      },
      queue: 'email',
    });
  } catch (err) {
    console.error('[contact-form]', err);
    return Response.json({ error: 'Failed to queue message' }, { status: 500 });
  }

  return Response.json({ success: true });
}
