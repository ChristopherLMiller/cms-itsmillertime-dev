import { decryptSecret } from '@/lib/settings-encryption';
import type { SocialPlatformType } from '@/utilities/socialPlatforms';

export type SocialDestinationRow = {
  id?: string | null;
  label?: string | null;
  type?: string | null;
  enabled?: boolean | null;
  defaultSelected?: boolean | null;
  webhookUrl?: string | null;
  subreddit?: string | null;
  instanceUrl?: string | null;
  handle?: string | null;
  pageId?: string | null;
  boardId?: string | null;
  chatId?: string | null;
  blogName?: string | null;
  clientId?: string | null;
  clientSecret?: string | null;
  accessToken?: string | null;
  refreshToken?: string | null;
  apiKey?: string | null;
  apiSecret?: string | null;
  appPassword?: string | null;
  botToken?: string | null;
  bearerToken?: string | null;
  notes?: string | null;
};

export type AnnounceAdapterResult = {
  ok: boolean;
  skipped?: boolean;
  error?: string;
  status?: number;
};

function secret(value: string | null | undefined): string {
  if (!value || typeof value !== 'string') return '';
  try {
    return decryptSecret(value.trim());
  } catch {
    return value.trim();
  }
}

async function postDiscordOrSlack(
  webhookUrl: string,
  content: string,
): Promise<AnnounceAdapterResult> {
  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    return {
      ok: false,
      status: res.status,
      error: `Webhook failed (${res.status}): ${body.slice(0, 300)}`,
    };
  }
  return { ok: true, status: res.status };
}

async function postCustomWebhook(
  webhookUrl: string,
  bearerToken: string,
  payload: { content: string; url: string; title: string; collection: string },
): Promise<AnnounceAdapterResult> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (bearerToken) headers.Authorization = `Bearer ${bearerToken}`;
  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    return {
      ok: false,
      status: res.status,
      error: `Custom webhook failed (${res.status}): ${body.slice(0, 300)}`,
    };
  }
  return { ok: true, status: res.status };
}

export async function sendToDestination(args: {
  destination: SocialDestinationRow;
  content: string;
  url: string;
  title: string;
  collection: string;
}): Promise<AnnounceAdapterResult> {
  const { destination, content, url, title, collection } = args;
  const type = (destination.type || '') as SocialPlatformType;

  switch (type) {
    case 'discord':
    case 'slack': {
      const webhookUrl = secret(destination.webhookUrl);
      if (!webhookUrl) {
        return { ok: false, error: `${type} destination is missing webhookUrl` };
      }
      return postDiscordOrSlack(webhookUrl, content);
    }
    case 'custom_webhook': {
      const webhookUrl = secret(destination.webhookUrl);
      if (!webhookUrl) {
        return { ok: false, error: 'custom_webhook destination is missing webhookUrl' };
      }
      return postCustomWebhook(webhookUrl, secret(destination.bearerToken), {
        content,
        url,
        title,
        collection,
      });
    }
    default:
      return {
        ok: false,
        skipped: true,
        error: `Adapter for “${type}” is not implemented yet. Configure Discord, Slack, or a custom webhook for now.`,
      };
  }
}
