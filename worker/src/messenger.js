/**
 * Everything that speaks the Messenger Platform dialect: reading the webhook
 * envelope Meta POSTs for a Facebook Page, and calling the Send API to reply.
 */

import { chunkText } from './whatsapp.js';

/** Messenger rejects a text message longer than this. */
export const MAX_BODY_LENGTH = 2000;

/**
 * Pull the user-sent messages out of a Page webhook payload.
 *
 * The same `messaging` array carries delivery and read receipts, postbacks,
 * and echoes of the Page's own replies — answering an echo would have the bot
 * talking to itself — so this returns only real inbound messages, flattened.
 *
 * @returns {Array<{id: string, from: string, type: string, text: string, timestamp: number|null}>}
 */
export function parseIncoming(payload) {
  if (!payload || payload.object !== 'page') return [];

  const messages = [];
  for (const entry of payload.entry ?? []) {
    for (const event of entry.messaging ?? []) {
      const message = event?.message;
      const from = event?.sender?.id;
      if (!message?.mid || !from || message.is_echo) continue;

      const hasText = typeof message.text === 'string';
      messages.push({
        id: message.mid,
        from,
        type: hasText ? 'text' : (message.attachments?.[0]?.type ?? 'unknown'),
        text: hasText ? message.text : '',
        timestamp: event.timestamp ?? null,
      });
    }
  }
  return messages;
}

function sendApiUrl(config) {
  return `https://graph.facebook.com/${config.graphApiVersion}/me/messages`;
}

async function postToSendApi(config, body) {
  const response = await fetch(sendApiUrl(config), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.messengerPageToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Send API ${response.status}: ${detail.slice(0, 500)}`);
  }
  return response.json();
}

/** Send one or more text messages, in order. Returns the number sent. */
export async function sendText(config, to, text) {
  const chunks = chunkText(text, MAX_BODY_LENGTH);
  for (const chunk of chunks) {
    await postToSendApi(config, {
      recipient: { id: to },
      messaging_type: 'RESPONSE',
      message: { text: chunk },
    });
  }
  return chunks.length;
}

/**
 * Mark the thread seen and show a typing bubble while Claude thinks.
 *
 * Cosmetic only — the caller is expected to swallow the rejection.
 */
export async function markSeenAndTyping(config, to) {
  await postToSendApi(config, { recipient: { id: to }, sender_action: 'mark_seen' });
  await postToSendApi(config, { recipient: { id: to }, sender_action: 'typing_on' });
}
