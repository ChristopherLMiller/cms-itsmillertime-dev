import type { PayloadRequest } from 'payload';

export async function contactFormHandler(req: PayloadRequest): Promise<Response> {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const parseJson = req.json;
  if (!parseJson) {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  let body: { name?: string; email?: string; message?: string };
  try {
    body = (await parseJson.call(req)) as {
      name?: string;
      email?: string;
      message?: string;
    };
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const name = body.name?.trim();
  const email = body.email?.trim();
  const message = body.message?.trim();

  if (!name || !email || !message) {
    return Response.json(
      { error: 'Name, email, and message are required' },
      { status: 400 },
    );
  }

  if (!process.env.CONTACT_EMAIL) {
    return Response.json(
      { error: 'Contact form recipient is not configured' },
      { status: 500 },
    );
  }

  try {
    await req.payload.jobs.queue({
      task: 'sendContactFormEmail',
      input: { name, email, message },
      queue: 'email',
    });
  } catch (err) {
    console.error('[contact-form]', err);
    return Response.json({ error: 'Failed to queue message' }, { status: 500 });
  }

  return Response.json({ success: true });
}
