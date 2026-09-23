/**
 * Environment plumbing for the bot.
 *
 * Secrets arrive as Worker secrets (`wrangler secret put`), tuning knobs as
 * plain `[vars]` in wrangler.toml. Everything is read and validated once per
 * request so a missing binding fails loudly at the edge rather than halfway
 * through a conversation.
 */

export const DEFAULT_SYSTEM_PROMPT = [
  'You are a helpful assistant replying over WhatsApp.',
  '',
  'WhatsApp is a chat app, not a document viewer. Keep replies short and',
  'conversational — usually under 1200 characters. Write in plain text: no',
  'markdown headings, no tables, no code fences unless the user asked for code.',
  'WhatsApp supports *bold*, _italic_ and ```monospace``` only.',
  '',
  'Answer in whatever language the user writes in. If you do not know',
  'something, say so rather than guessing.',
].join('\n');

export const MESSENGER_SYSTEM_PROMPT = [
  'You are a helpful assistant replying over Facebook Messenger.',
  '',
  'Messenger is a chat app, not a document viewer. Keep replies short and',
  'conversational — usually under 1200 characters. Write in plain text only:',
  'Messenger shows markdown symbols literally, so no headings, tables, bold,',
  'italics or code fences unless the user asked for code.',
  '',
  'Answer in whatever language the user writes in. If you do not know',
  'something, say so rather than guessing.',
].join('\n');

/** The built-in prompt for a channel, used when SYSTEM_PROMPT is not set. */
export function defaultSystemPrompt(channel) {
  return channel === 'messenger' ? MESSENGER_SYSTEM_PROMPT : DEFAULT_SYSTEM_PROMPT;
}

function intVar(value, fallback) {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/** Reduce any phone-number spelling to bare digits, the shape Meta uses for `wa_id`. */
export function normalizeNumber(value) {
  return String(value ?? '').replace(/\D/g, '');
}

/**
 * Parse ALLOWED_NUMBERS (or MESSENGER_ALLOWED_IDS) into a matcher.
 *
 * Deliberately deny-by-default: an unset list blocks everyone rather than
 * letting any stranger who finds the number spend the account's tokens.
 * Set it to `*` to run an open bot on purpose.
 */
export function parseAllowlist(raw) {
  const value = String(raw ?? '').trim();
  if (value === '*') return { open: true, numbers: [] };
  const numbers = value
    .split(',')
    .map(normalizeNumber)
    .filter(Boolean);
  return { open: false, numbers };
}

export function isAllowed(allowlist, from) {
  if (allowlist.open) return true;
  return allowlist.numbers.includes(normalizeNumber(from));
}

/**
 * The app secret and verify token belong to the Meta app, not to a channel, so
 * they are shared. The META_* names are preferred; the WHATSAPP_* names from
 * the original WhatsApp-only setup are still accepted.
 */
export function loadConfig(env) {
  const appSecret = env.META_APP_SECRET || env.WHATSAPP_APP_SECRET;
  const verifyToken = env.META_VERIFY_TOKEN || env.WHATSAPP_VERIFY_TOKEN;
  const whatsappEnabled = Boolean(env.WHATSAPP_TOKEN);
  const messengerEnabled = Boolean(env.MESSENGER_PAGE_TOKEN);

  const missing = [];
  if (!env.ANTHROPIC_API_KEY) missing.push('ANTHROPIC_API_KEY');
  if (!appSecret) missing.push('META_APP_SECRET');
  if (!verifyToken) missing.push('META_VERIFY_TOKEN');
  if (whatsappEnabled && !env.WHATSAPP_PHONE_NUMBER_ID) missing.push('WHATSAPP_PHONE_NUMBER_ID');
  if (!whatsappEnabled && !messengerEnabled) {
    missing.push('a channel (MESSENGER_PAGE_TOKEN, or WHATSAPP_TOKEN + WHATSAPP_PHONE_NUMBER_ID)');
  }
  if (missing.length > 0) {
    throw new Error(`Missing required binding(s): ${missing.join(', ')}`);
  }

  return Object.freeze({
    anthropicApiKey: env.ANTHROPIC_API_KEY,
    appSecret,
    verifyToken,

    whatsappEnabled,
    whatsappToken: env.WHATSAPP_TOKEN,
    phoneNumberId: env.WHATSAPP_PHONE_NUMBER_ID,
    allowlist: parseAllowlist(env.ALLOWED_NUMBERS),

    messengerEnabled,
    messengerPageToken: env.MESSENGER_PAGE_TOKEN,
    messengerAllowlist: parseAllowlist(env.MESSENGER_ALLOWED_IDS),

    graphApiVersion: env.GRAPH_API_VERSION || 'v23.0',
    webhookPath: env.WEBHOOK_PATH || '/webhook',

    model: env.CLAUDE_MODEL || 'claude-opus-5',
    effort: env.CLAUDE_EFFORT || 'low',
    maxTokens: intVar(env.CLAUDE_MAX_TOKENS, 4096),
    // null means "use the channel's built-in prompt"; see defaultSystemPrompt.
    systemPrompt: env.SYSTEM_PROMPT || null,

    historyMessages: intVar(env.HISTORY_MESSAGES, 20),
    historyTtlSeconds: intVar(env.HISTORY_TTL_SECONDS, 86400),
    chats: env.CHATS ?? null,
  });
}
