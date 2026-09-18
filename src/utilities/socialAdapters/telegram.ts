import { fail, missing, readErrorBody, secret, type AnnounceAdapterResult, type AnnouncePayload } from './types';

export async function postTelegram(args: AnnouncePayload): Promise<AnnounceAdapterResult> {
  const botToken = secret(args.destination.botToken);
  const chatId = (args.destination.chatId || '').trim();
  if (!botToken || !chatId) return missing('botToken', 'chatId');

  const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: args.content,
      disable_web_page_preview: false,
    }),
  });
  if (!res.ok) return fail(res.status, 'Telegram sendMessage failed', await readErrorBody(res));
  const json = (await res.json().catch(() => null)) as { ok?: boolean; description?: string } | null;
  if (json && json.ok === false) {
    return { ok: false, error: `Telegram API error: ${json.description || 'unknown'}` };
  }
  return { ok: true, status: res.status };
}
