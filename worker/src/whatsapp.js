/**
 * Everything that speaks the WhatsApp Cloud API dialect: reading the webhook
 * envelope Meta POSTs, and calling the Graph API to send text back.
 */

/** WhatsApp rejects a text body longer than this. */
export const MAX_BODY_LENGTH = 4096;

/**
 * Pull the user-sent messages out of a webhook payload.
 *
 * The envelope is deeply nested and the same shape carries delivery receipts
 * (`statuses`) that must not be answered, so this returns only real inbound
 * messages, flattened.
 *
 * @returns {Array<{id: string, from: string, type: string, text: string, name: string|null, timestamp: string|null}>}
 */
export function parseIncoming(payload) {
  if (!payload || payload.object !== 'whatsapp_business_account') return [];

  const messages = [];
  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change?.value;
      if (!value || !Array.isArray(value.messages)) continue;

      const names = new Map(
        (value.contacts ?? []).map((contact) => [contact.wa_id, contact.profile?.name ?? null]),
      );

      for (const message of value.messages) {
        if (!message?.id || !message?.from) continue;
        messages.push({
          id: message.id,
          from: message.from,
          type: message.type ?? 'unknown',
          text: message.type === 'text' ? (message.text?.body ?? '') : '',
          name: names.get(message.from) ?? null,
          timestamp: message.timestamp ?? null,
        });
      }
    }
  }
  return messages;
}

/**
 * Split a reply into WhatsApp-sized pieces, preferring paragraph, then line,
 * then word boundaries so a long answer does not get cut mid-sentence.
 */
export function chunkText(text, limit = MAX_BODY_LENGTH) {
  const clean = String(text ?? '').trim();
  if (!clean) return [];
  if (clean.length <= limit) return [clean];

  const chunks = [];
  let rest = clean;
  const minCut = Math.floor(limit * 0.5);

  while (rest.length > limit) {
    let cut = rest.lastIndexOf('\n\n', limit);
    if (cut < minCut) cut = rest.lastIndexOf('\n', limit);
    if (cut < minCut) cut = rest.lastIndexOf(' ', limit);
    if (cut < minCut) cut = limit;

    chunks.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest) chunks.push(rest);
  return chunks;
}

function graphUrl(config) {
  return `https://graph.facebook.com/${config.graphApiVersion}/${config.phoneNumberId}/messages`;
}

async function postToGraph(config, body) {
  const response = await fetch(graphUrl(config), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.whatsappToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Graph API ${response.status}: ${detail.slice(0, 500)}`);
  }
  return response.json();
}

/** Send one or more text messages, in order. Returns the number sent. */
export async function sendText(config, to, text) {
  const chunks = chunkText(text);
  for (const chunk of chunks) {
    await postToGraph(config, {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'text',
      text: { preview_url: false, body: chunk },
    });
  }
  return chunks.length;
}

/**
 * Show the blue ticks and a typing bubble while Claude thinks.
 *
 * Cosmetic only — a failure here must never cost the user their answer, so the
 * caller is expected to swallow the rejection.
 */
export async function markReadAndTyping(config, messageId) {
  return postToGraph(config, {
    messaging_product: 'whatsapp',
    status: 'read',
    message_id: messageId,
    typing_indicator: { type: 'text' },
  });
}
