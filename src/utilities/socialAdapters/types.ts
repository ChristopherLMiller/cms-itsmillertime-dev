import { decryptSecret } from '@/lib/settings-encryption';

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
  /** When false, the job should not retry (missing creds / permanent API rejection). Default true when ok=false. */
  retryable?: boolean;
  error?: string;
  status?: number;
};

export type AnnouncePayload = {
  destination: SocialDestinationRow;
  content: string;
  url: string;
  title: string;
  collection: string;
};

export function secret(value: string | null | undefined): string {
  if (!value || typeof value !== 'string') return '';
  try {
    return decryptSecret(value.trim());
  } catch {
    return value.trim();
  }
}

export async function readErrorBody(res: Response): Promise<string> {
  return (await res.text().catch(() => '')).slice(0, 400);
}

export function fail(status: number, prefix: string, body: string): AnnounceAdapterResult {
  return {
    ok: false,
    status,
    error: `${prefix} (${status}): ${body}`,
  };
}

export function missing(...fields: string[]): AnnounceAdapterResult {
  return {
    ok: false,
    retryable: false,
    error: `Missing required fields: ${fields.join(', ')}`,
  };
}

/** Best-effort Open Graph / Twitter image from a public page (for Instagram / Pinterest). */
export async function fetchOgImage(pageUrl: string): Promise<string | null> {
  try {
    const res = await fetch(pageUrl, {
      headers: { 'User-Agent': 'ItsMillerTimeCMS/1.0 (+announce)' },
      redirect: 'follow',
    });
    if (!res.ok) return null;
    const html = (await res.text()).slice(0, 200_000);
    const patterns = [
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
      /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i,
    ];
    for (const re of patterns) {
      const match = html.match(re);
      if (match?.[1]) {
        try {
          return new URL(match[1], pageUrl).toString();
        } catch {
          return match[1];
        }
      }
    }
  } catch {
    // ignore
  }
  return null;
}
