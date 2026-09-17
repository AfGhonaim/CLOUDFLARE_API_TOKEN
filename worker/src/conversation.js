/**
 * Per-contact conversation memory, held in Workers KV.
 *
 * The Messages API is stateless, so the whole thread is replayed on every turn.
 * KV keeps that thread between Worker invocations; the TTL means an abandoned
 * chat expires on its own instead of accumulating forever.
 */

const HISTORY_PREFIX = 'chat:';
const SEEN_PREFIX = 'seen:';

/** KV refuses a TTL below 60 seconds. */
const MIN_TTL = 60;

/**
 * Keep the tail of the conversation, then drop leading assistant turns:
 * the Messages API requires the first message to be from the user.
 */
export function trimHistory(messages, maxMessages) {
  let trimmed = messages.length > maxMessages ? messages.slice(-maxMessages) : messages.slice();
  while (trimmed.length > 0 && trimmed[0].role !== 'user') {
    trimmed.shift();
  }
  return trimmed;
}

export async function loadHistory(config, waId) {
  if (!config.chats) return [];
  const stored = await config.chats.get(HISTORY_PREFIX + waId, { type: 'json' });
  return Array.isArray(stored?.messages) ? stored.messages : [];
}

export async function saveHistory(config, waId, messages) {
  if (!config.chats) return;
  await config.chats.put(
    HISTORY_PREFIX + waId,
    JSON.stringify({ messages: trimHistory(messages, config.historyMessages), updatedAt: Date.now() }),
    { expirationTtl: Math.max(config.historyTtlSeconds, MIN_TTL) },
  );
}

export async function clearHistory(config, waId) {
  if (!config.chats) return;
  await config.chats.delete(HISTORY_PREFIX + waId);
}

/**
 * Best-effort replay protection.
 *
 * Meta re-delivers a webhook it believes failed, which without this would
 * answer the same question twice. KV has no atomic compare-and-set, so two
 * deliveries landing in the same instant can still both get through; for a
 * chat bot a rare duplicate reply is cheaper than the complexity of a Durable
 * Object.
 */
export async function alreadyHandled(config, messageId) {
  if (!config.chats) return false;
  const key = SEEN_PREFIX + messageId;
  if (await config.chats.get(key)) return true;
  await config.chats.put(key, '1', { expirationTtl: 86400 });
  return false;
}
