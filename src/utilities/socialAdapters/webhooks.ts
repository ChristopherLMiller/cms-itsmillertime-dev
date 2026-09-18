import { fail, missing, secret, type AnnounceAdapterResult, type AnnouncePayload } from './types';

export async function postDiscord(args: AnnouncePayload): Promise<AnnounceAdapterResult> {
  const webhookUrl = secret(args.destination.webhookUrl);
  if (!webhookUrl) return missing('webhookUrl');

  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: args.content }),
  });
  if (!res.ok) return fail(res.status, 'Discord webhook failed', await res.text().catch(() => ''));
  return { ok: true, status: res.status };
}

export async function postSlack(args: AnnouncePayload): Promise<AnnounceAdapterResult> {
  const webhookUrl = secret(args.destination.webhookUrl);
  if (!webhookUrl) return missing('webhookUrl');

  // Slack incoming webhooks use `text`, not Discord's `content`.
  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: args.content }),
  });
  if (!res.ok) return fail(res.status, 'Slack webhook failed', await res.text().catch(() => ''));
  return { ok: true, status: res.status };
}

export async function postCustomWebhook(args: AnnouncePayload): Promise<AnnounceAdapterResult> {
  const webhookUrl = secret(args.destination.webhookUrl);
  if (!webhookUrl) return missing('webhookUrl');

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const bearer = secret(args.destination.bearerToken);
  if (bearer) headers.Authorization = `Bearer ${bearer}`;

  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      content: args.content,
      url: args.url,
      title: args.title,
      collection: args.collection,
    }),
  });
  if (!res.ok) return fail(res.status, 'Custom webhook failed', await res.text().catch(() => ''));
  return { ok: true, status: res.status };
}
